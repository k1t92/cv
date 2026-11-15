/**
 * SSRF protection for operator-supplied feed URLs.
 *
 * A feed URL is typed into the admin panel and then fetched from inside our infrastructure,
 * so it must never be able to reach loopback, private networks, link-local / cloud metadata
 * endpoints, or anything else that is not a public internet host.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {}

export type Resolver = (hostname: string) => Promise<{ address: string; family: number }[]>;

const systemResolver: Resolver = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

function ipv4ToInt(address: string): number {
  return address.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

// [network, prefix length] — everything that is not ordinary public unicast space.
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],        // "this network"
  ["10.0.0.0", 8],       // private
  ["100.64.0.0", 10],    // carrier-grade NAT (also used by some cloud internals)
  ["127.0.0.0", 8],      // loopback
  ["169.254.0.0", 16],   // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12],    // private
  ["192.0.0.0", 24],     // IETF protocol assignments
  ["192.0.2.0", 24],     // documentation
  ["192.88.99.0", 24],   // 6to4 relay
  ["192.168.0.0", 16],   // private
  ["198.18.0.0", 15],    // benchmarking
  ["198.51.100.0", 24],  // documentation
  ["203.0.113.0", 24],   // documentation
  ["224.0.0.0", 4],      // multicast
  ["240.0.0.0", 4],      // reserved + broadcast
];

function isBlockedV4(address: string): boolean {
  const value = ipv4ToInt(address);
  return BLOCKED_V4.some(([network, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(network) & mask);
  });
}

/** Expand an IPv6 literal to its 8 hextets; returns null if it cannot be parsed. */
function expandV6(address: string): number[] | null {
  let text = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0]!;
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = ipv4ToInt(dotted[1]!);
    text = text.slice(0, -dotted[1]!.length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const parts = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((h) => Number.parseInt(h, 16));
  return parts.length === 8 && parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 0xffff) ? parts : null;
}

function isBlockedV6(address: string): boolean {
  const p = expandV6(address);
  if (!p) return true; // unparseable: refuse
  const embeddedV4 = `${p[6]! >>> 8}.${p[6]! & 0xff}.${p[7]! >>> 8}.${p[7]! & 0xff}`;
  if (p.slice(0, 6).every((x) => x === 0)) return p[6] === 0 && p[7]! <= 1 ? true : isBlockedV4(embeddedV4); // ::, ::1, IPv4-compatible
  if (p.slice(0, 5).every((x) => x === 0) && p[5] === 0xffff) return isBlockedV4(embeddedV4);                 // ::ffff:a.b.c.d
  if (p[0] === 0x64 && p[1] === 0xff9b) return isBlockedV4(embeddedV4);                                        // NAT64
  if (p[0] === 0x2002) return isBlockedV4(`${p[1]! >>> 8}.${p[1]! & 0xff}.${p[2]! >>> 8}.${p[2]! & 0xff}`);   // 6to4
  if ((p[0]! & 0xfe00) === 0xfc00) return true;  // fc00::/7 unique local
  if ((p[0]! & 0xffc0) === 0xfe80) return true;  // fe80::/10 link-local
  if ((p[0]! & 0xffc0) === 0xfec0) return true;  // fec0::/10 site-local (deprecated)
  if ((p[0]! & 0xff00) === 0xff00) return true;  // multicast
  if (p[0] === 0x2001 && p[1] === 0xdb8) return true; // documentation
  if (p[0] === 0x2001 && p[1] === 0) return true;     // Teredo
  return false;
}

/** True for any address that is not public unicast (private, loopback, link-local, metadata, …). */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address.replace(/^\[|\]$/g, ""));
  if (family === 4) return isBlockedV4(address);
  if (family === 6) return isBlockedV6(address);
  return true;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".svc", ".cluster.local"];

export interface UrlPolicy {
  /** Tests only. Never derived from configuration, the database or user input. */
  allowPrivateForTests?: boolean;
  resolver?: Resolver;
}

/**
 * Validate a feed URL and resolve its host. Returns the parsed URL plus the vetted addresses;
 * the caller must connect to one of *these* addresses (see fetch.ts) so a second DNS answer
 * cannot redirect the request elsewhere (DNS rebinding).
 */
export async function assertPublicUrl(raw: string, policy: UrlPolicy = {}): Promise<{ url: URL; addresses: { address: string; family: number }[] }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Feed URL is not a valid URL");
  }
  const test = policy.allowPrivateForTests === true;
  if (url.protocol !== "https:" && !(test && url.protocol === "http:")) throw new UnsafeUrlError("Feed URL must use https://");
  if (url.username || url.password) throw new UnsafeUrlError("Feed URL must not contain a username or password");
  if (url.port && url.port !== "443" && !test) throw new UnsafeUrlError("Feed URL must use the default HTTPS port");

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host) throw new UnsafeUrlError("Feed URL has no host");
  if (!test) {
    if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) || (!host.includes(".") && !host.includes(":"))) {
      throw new UnsafeUrlError(`Host "${host}" is not a public internet host`);
    }
  }

  const literal = isIP(host);
  let addresses: { address: string; family: number }[];
  if (literal) addresses = [{ address: host, family: literal }];
  else {
    try {
      addresses = await (policy.resolver ?? systemResolver)(host);
    } catch {
      throw new UnsafeUrlError(`Could not resolve host "${host}"`);
    }
  }
  if (addresses.length === 0) throw new UnsafeUrlError(`Host "${host}" did not resolve`);
  // Refuse if ANY answer is internal: a mixed answer is how rebinding attacks get through.
  const blocked = addresses.find((a) => isBlockedAddress(a.address));
  if (blocked && !test) throw new UnsafeUrlError(`Host "${host}" resolves to a non-public address`);
  return { url, addresses };
}

const SECRET_ENV = /^FEED_[A-Z0-9_]+$/;

export function isFeedSecretName(name: string): boolean {
  return SECRET_ENV.test(name);
}

/**
 * Substitute ${FEED_*} placeholders so API keys can live in the environment instead of the
 * database. Only variables with the FEED_ prefix may be referenced: otherwise a feed URL could
 * be used to send DATABASE_URL or ADMIN_TOKEN to an arbitrary host.
 */
export function resolveSecrets(template: string, env: Record<string, string | undefined> = process.env): string {
  return template.replace(/\$\{([^}]*)\}/g, (_, name: string) => {
    if (!isFeedSecretName(name)) throw new UnsafeUrlError(`Only \${FEED_*} variables may be used in a feed URL (got "${name}")`);
    const value = env[name];
    if (!value) throw new UnsafeUrlError(`Environment variable ${name} is not set`);
    return encodeURIComponent(value);
  });
}
