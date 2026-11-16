import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import type { LookupFunction } from "node:net";
import { createGunzip } from "node:zlib";
import { assertPublicUrl, resolveSecrets, UnsafeUrlError, type UrlPolicy } from "./safe-url";

/**
 * Identifiable User-Agent. BOT_CONTACT (an email or URL where a site owner can reach the
 * operator) must be set before any public-page collection is allowed to run.
 */
export const BOT_CONTACT = process.env.BOT_CONTACT ?? "";
export const USER_AGENT = `SCENTEX-bot/0.3 (perfume price comparison; ${BOT_CONTACT ? `contact: ${BOT_CONTACT}` : `+${process.env.SITE_URL ?? "https://scentex.example"}`})`;

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

interface Hop { status: number; location?: string; body?: Buffer; headers: http.IncomingHttpHeaders; preview?: string }

/**
 * Some deployments must send all outbound traffic through a mandatory corporate egress proxy.
 * Opt-in only (SCENTEX_USE_EGRESS_PROXY=1 + HTTPS_PROXY). This is the operator's own gateway,
 * never a means of hiding from or getting around a site's access controls. The destination is
 * still vetted by assertPublicUrl before the tunnel is requested.
 */
function egressProxy(): URL | null {
  if (process.env.SCENTEX_USE_EGRESS_PROXY !== "1") return null;
  const raw = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  return raw ? new URL(raw) : null;
}

function openTunnel(proxy: URL, host: string, timeoutMs: number): Promise<import("node:net").Socket> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Host: `${host}:443` };
    if (proxy.username) headers["Proxy-Authorization"] = `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64")}`;
    const connect = http.request({ host: proxy.hostname, port: Number(proxy.port || 80), method: "CONNECT", path: `${host}:443`, headers, timeout: timeoutMs });
    connect.on("connect", (response, socket) => {
      if (response.statusCode === 200) resolve(socket);
      else {
        socket.destroy();
        reject(new Error(`Egress proxy refused the connection (${response.statusCode})`));
      }
    });
    connect.on("timeout", () => connect.destroy(new Error("Egress proxy timed out")));
    connect.on("error", reject);
    connect.end();
  });
}

/** One request, connected to an address that was vetted beforehand (no second DNS lookup). */
async function requestOnce(url: URL, addresses: { address: string; family: number }[], headers: Record<string, string>, deadline: number, maxBytes: number): Promise<Hop> {
  const proxy = url.protocol === "https:" ? egressProxy() : null;
  const tunnel = proxy ? await openTunnel(proxy, url.hostname, Math.max(1, deadline - Date.now())) : null;
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
      tunnel?.destroy();
      reject(error);
    }

    // Through an egress proxy the TLS session runs inside the CONNECT tunnel; otherwise we dial the vetted address.
    const tunnelAgent = tunnel
      ? new (class extends https.Agent {
          createConnection() {
            return tls.connect({ socket: tunnel, servername: url.hostname });
          }
        })({ keepAlive: false })
      : null;
    const transport: https.RequestOptions = tunnelAgent ? { agent: tunnelAgent } : { agent: false, lookup: pinned };
    const request = client.request(url, { method: "GET", headers, ...transport }, (response) => {
      const status = response.statusCode ?? 0;
      if (status !== 200) {
        // Keep only the first bytes of an error page: enough to tell who answered, never the whole body.
        const head: Buffer[] = [];
        let kept = 0;
        response.on("data", (chunk: Buffer) => {
          if (kept < 2048) head.push(chunk.subarray(0, 2048 - kept));
          kept += chunk.length;
        });
        response.on("end", () => {
          const raw = Buffer.concat(head);
          const textual = raw[0] === 0x1f ? "" : raw.toString("utf8");
          const preview = textual.replace(/<(script|style)[\s\S]*?(<\/\1>|$)/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
          done({ status, headers: response.headers, preview, location: status >= 300 && status < 400 && status !== 304 ? response.headers.location : undefined });
        });
        response.on("error", () => done({ status, headers: response.headers }));
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
      const finish = () => done({ status, headers: response.headers, body: Buffer.concat(chunks) });

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

export interface SafeResponse {
  status: number;
  /** Decoded body for 200 responses; null otherwise (e.g. 304, 403, 404). */
  body: string | null;
  headers: http.IncomingHttpHeaders;
  finalUrl: string;
  /** Plain-text start of a non-200 body (max 160 chars), for diagnosing refusals. */
  bodyPreview?: string;
}

export interface SafeGetOptions extends FetchFeedOptions {
  headers?: Record<string, string>;
  /** Redirects that leave the original host are refused (used by the page crawler). */
  sameHostOnly?: boolean;
}

/** Guarded GET shared by the feed importer and the public-page crawler. Never throws on HTTP status. */
export async function safeGet(urlText: string, options: SafeGetOptions = {}): Promise<SafeResponse> {
  const maxBytes = options.maxBytes ?? FEED_LIMITS.maxBytes;
  const deadline = Date.now() + (options.timeoutMs ?? FEED_LIMITS.timeoutMs);
  let current = urlText;
  let originHost: string | null = null;

  for (let hop = 0; hop <= FEED_LIMITS.maxRedirects; hop++) {
    const { url, addresses } = await assertPublicUrl(current, { ...options.policy, resolvedByEgressProxy: current.startsWith("https:") && egressProxy() != null });
    originHost ??= url.host;
    if (options.sameHostOnly && url.host !== originHost) throw new UnsafeUrlError(`Redirect to another host (${url.host}) was refused`);
    const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "*/*", "Accept-Encoding": "gzip", ...options.headers };
    if (options.authHeader && url.host === originHost) {
      const [name, value] = parseAuthHeader(options.authHeader);
      headers[name] = value;
    }
    let result: Hop;
    try {
      result = await requestOnce(url, addresses, headers, deadline, maxBytes);
    } catch (error) {
      throw new Error(`Could not download from ${url.host}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (result.status >= 300 && result.status < 400 && result.status !== 304) {
      if (!result.location) throw new Error(`${url.host} sent a redirect without a location`);
      try {
        current = new URL(result.location, url).toString();
      } catch {
        throw new UnsafeUrlError("Redirected to an invalid URL");
      }
      continue;
    }
    return { status: result.status, headers: result.headers, finalUrl: url.toString(), bodyPreview: result.preview, body: result.body ? result.body.toString("utf8").replace(/^\uFEFF/, "") : null };
  }
  throw new Error(`Request redirected more than ${FEED_LIMITS.maxRedirects} times`);
}

/**
 * Download a product feed the operator is entitled to use.
 *
 * Security properties (shared with safeGet):
 *  - https only, default port, no credentials in the URL;
 *  - host must resolve exclusively to public addresses, and the connection is pinned to the
 *    vetted address (no DNS rebinding);
 *  - redirects are followed manually (max 3) and every hop is re-validated the same way;
 *  - the auth header is sent to the original host only, never to a redirect target;
 *  - download size, decompressed size and total time are capped;
 *  - error messages name the host only, never the full URL (which may contain a key).
 */
export async function fetchFeed(urlTemplate: string, options: FetchFeedOptions = {}): Promise<string> {
  const response = await safeGet(resolveSecrets(urlTemplate), options);
  if (response.body == null) throw new Error(`Feed host ${new URL(response.finalUrl).host} responded with HTTP ${response.status}`);
  return response.body;
}
