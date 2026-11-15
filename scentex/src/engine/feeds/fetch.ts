import { gunzipSync } from "node:zlib";

export const USER_AGENT = `SCENTEX/0.2 (+${process.env.SITE_URL ?? "https://scentex.example"}; perfume price tracker)`;

const MAX_BYTES = 250 * 1024 * 1024;

export interface FetchFeedOptions {
  /** "Header-Name: value", resolved from an env var by the caller. */
  authHeader?: string;
  timeoutMs?: number;
}

/**
 * Download a product feed the operator is entitled to use (affiliate network feed URL,
 * retailer-provided export, etc.). This is a plain authenticated download: it does not
 * crawl pages, solve challenges or disguise itself.
 */
export async function fetchFeed(url: string, options: FetchFeedOptions = {}): Promise<string> {
  const target = new URL(url);
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error(`Unsupported feed URL scheme: ${target.protocol}`);
  const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "*/*" };
  if (options.authHeader) {
    const index = options.authHeader.indexOf(":");
    if (index < 1) throw new Error('Auth header must look like "Header-Name: value"');
    headers[options.authHeader.slice(0, index).trim()] = options.authHeader.slice(index + 1).trim();
  }
  let response: Response;
  try {
    response = await fetch(target, { headers, redirect: "follow", signal: AbortSignal.timeout(options.timeoutMs ?? 120_000) });
  } catch (error) {
    // Node reports network failures as a bare "fetch failed"; surface the underlying reason for the import log.
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : error instanceof Error ? error.message : String(error);
    throw new Error(`Could not download feed from ${target.host}: ${cause}`);
  }
  if (!response.ok) throw new Error(`Feed responded ${response.status} ${response.statusText}`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error(`Feed is too large (${declared} bytes)`);
  let body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_BYTES) throw new Error(`Feed is too large (${body.length} bytes)`);
  // Affiliate networks commonly serve .gz files without a Content-Encoding header.
  if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body, { maxOutputLength: MAX_BYTES });
  return body.toString("utf8").replace(/^﻿/, "");
}
