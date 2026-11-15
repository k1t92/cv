import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { createGunzip } from "node:zlib";
import { assertPublicUrl, resolveSecrets, UnsafeUrlError, type UrlPolicy } from "./safe-url";

export const USER_AGENT = `SCENTEX/0.2 (+${process.env.SITE_URL ?? "https://scentex.example"}; perfume price tracker)`;

const envInt = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** Limits apply to the bytes on the wire and, separately, to the decompressed size. */
export const FEED_LIMITS = {
  maxBytes: envInt("FEED_MAX_BYTES", 250 * 1024 * 1024),
  timeoutMs: envInt("FEED_TIMEOUT_MS", 120_000),
  maxRedirects: 3,
};

export interface FetchFeedOptions {
  /** "Header-Name: value", resolved from a FEED_* env var by the caller. */
  authHeader?: string;
  timeoutMs?: number;
  maxBytes?: number;
  policy?: UrlPolicy;
}

function parseAuthHeader(authHeader: string): [string, string] {
  const index = authHeader.indexOf(":");
  const name = authHeader.slice(0, index).trim();
  const value = authHeader.slice(index + 1).trim();
  if (index < 1 || !/^[A-Za-z0-9-]+$/.test(name) || /[\r\n]/.test(value)) throw new Error('Auth header must look like "Header-Name: value"');
  return [name, value];
}

interface Hop { status: number; location?: string; body?: Buffer }

/** One request, connected to an address that was vetted beforehand (no second DNS lookup). */
function requestOnce(url: URL, addresses: { address: string; family: number }[], headers: Record<string, string>, deadline: number, maxBytes: number): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const pinned: LookupFunction = (_hostname, options, callback) => {
      const cb = callback as (err: Error | null, address: unknown, family?: number) => void;
      if (typeof options === "object" && options.all) cb(null, addresses);
      else cb(null, addresses[0]!.address, addresses[0]!.family);
    };
    const client = url.protocol === "https:" ? https : http;
    let settled = false;
    let inflater: ReturnType<typeof createGunzip> | null = null;
    const timer = setTimeout(() => fail(new Error("Feed download timed out")), Math.max(1, deadline - Date.now()));
    const done = (hop: Hop) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(hop);
    };
    // Single failure path: once a limit is hit nothing that arrives later can turn it into a success.
    function fail(error: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      inflater?.destroy();
      request.destroy();
      reject(error);
    }

    const request = client.request(url, { method: "GET", headers, lookup: pinned, agent: false }, (response) => {
      const status = response.statusCode ?? 0;
      if (status !== 200) {
        response.resume();
        done({ status, location: status >= 300 && status < 400 ? response.headers.location : undefined });
        return;
      }
      if (Number(response.headers["content-length"] ?? 0) > maxBytes) return fail(new Error(`Feed is larger than the ${maxBytes}-byte limit`));

      let wire = 0;
      let size = 0;
      const chunks: Buffer[] = [];
      const collect = (chunk: Buffer) => {
        size += chunk.length;
        // Decompression-bomb guard: the inflated size is capped as well as the bytes on the wire.
        if (size > maxBytes) fail(new Error(`Feed exceeded the ${maxBytes}-byte limit${inflater ? " after decompression" : ""}`));
        else chunks.push(chunk);
      };
      const finish = () => done({ status, body: Buffer.concat(chunks) });

      response.on("error", (error) => fail(error));
      response.on("data", (chunk: Buffer) => {
        if (settled) return;
        // Decide on gzip from the first bytes: networks serve .gz with and without Content-Encoding.
        if (wire === 0 && chunk.length >= 2 && chunk[0] === 0x1f && chunk[1] === 0x8b) {
          inflater = createGunzip();
          inflater.on("data", collect);
          inflater.on("end", finish);
          inflater.on("error", () => fail(new Error("Feed is not valid gzip data")));
        }
        wire += chunk.length;
        if (wire > maxBytes) return fail(new Error(`Feed exceeded the ${maxBytes}-byte download limit`));
        if (inflater) {
          // Respect back-pressure so a bomb cannot inflate unboundedly between checks.
          if (!inflater.write(chunk)) {
            response.pause();
            inflater.once("drain", () => response.resume());
          }
        } else collect(chunk);
      });
      response.on("end", () => (inflater ? inflater.end() : finish()));
    });
    request.on("error", (error) => fail(error));
    request.end();
  });
}

/**
 * Download a product feed the operator is entitled to use.
 *
 * Security properties:
 *  - https only, default port, no credentials in the URL;
 *  - host must resolve exclusively to public addresses, and the connection is pinned to the
 *    vetted address (no DNS rebinding);
 *  - redirects are followed manually (max 3) and every hop is re-validated the same way;
 *  - the auth header is sent to the original host only, never to a redirect target;
 *  - download size, decompressed size and total time are capped;
 *  - error messages name the host only, never the full URL (which may contain a key).
 */
export async function fetchFeed(urlTemplate: string, options: FetchFeedOptions = {}): Promise<string> {
  const maxBytes = options.maxBytes ?? FEED_LIMITS.maxBytes;
  const deadline = Date.now() + (options.timeoutMs ?? FEED_LIMITS.timeoutMs);
  let current = resolveSecrets(urlTemplate);
  let originHost: string | null = null;

  for (let hop = 0; hop <= FEED_LIMITS.maxRedirects; hop++) {
    const { url, addresses } = await assertPublicUrl(current, options.policy);
    originHost ??= url.host;
    const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "*/*", "Accept-Encoding": "gzip" };
    if (options.authHeader && url.host === originHost) {
      const [name, value] = parseAuthHeader(options.authHeader);
      headers[name] = value;
    }
    let result: Hop;
    try {
      result = await requestOnce(url, addresses, headers, deadline, maxBytes);
    } catch (error) {
      throw new Error(`Could not download feed from ${url.host}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (result.body) return result.body.toString("utf8").replace(/^﻿/, "");
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new Error(`Feed host ${url.host} sent a redirect without a location`);
      try {
        current = new URL(result.location, url).toString();
      } catch {
        throw new UnsafeUrlError("Feed redirected to an invalid URL");
      }
      continue;
    }
    throw new Error(`Feed host ${url.host} responded with HTTP ${result.status}`);
  }
  throw new Error(`Feed redirected more than ${FEED_LIMITS.maxRedirects} times`);
}
