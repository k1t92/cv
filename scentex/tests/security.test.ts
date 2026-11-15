import http from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchFeed } from "@/engine/feeds/fetch";
import { assertPublicUrl, isBlockedAddress, resolveSecrets, type Resolver } from "@/engine/feeds/safe-url";
import { rawOfferSchema } from "@/engine/types";

const resolvesTo = (...addresses: string[]): Resolver => async () => addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

describe("address classification", () => {
  it.each([
    "127.0.0.1", "127.8.9.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.10",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1", "2002:7f00:1::", "2001:db8::1", "[::1]", "not-an-ip", "",
  ])("blocks %s", (address) => expect(isBlockedAddress(address)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "193.0.0.1", "2606:4700:4700::1111", "2a00:1450:4001::200e", "::ffff:8.8.8.8"])(
    "allows %s", (address) => expect(isBlockedAddress(address)).toBe(false),
  );
});

describe("feed URL policy", () => {
  const publicDns = resolvesTo("93.184.216.34");

  it("accepts a public https URL", async () => {
    const { url, addresses } = await assertPublicUrl("https://feeds.example.com/a.csv?x=1", { resolver: publicDns });
    expect(url.hostname).toBe("feeds.example.com");
    expect(addresses[0]!.address).toBe("93.184.216.34");
  });

  it.each([
    ["http://feeds.example.com/a.csv", /https/],
    ["ftp://feeds.example.com/a.csv", /https/],
    ["file:///etc/passwd", /https/],
    ["https://user:pass@feeds.example.com/a.csv", /username or password/],
    ["https://feeds.example.com:8443/a.csv", /port/],
    ["https://localhost/a.csv", /not a public/],
    ["https://db/a.csv", /not a public/],
    ["https://metadata.google.internal/computeMetadata/v1/", /not a public/],
    ["https://printer.local/a.csv", /not a public/],
    ["https://127.0.0.1/a.csv", /non-public/],
    ["https://169.254.169.254/latest/meta-data/", /non-public/],
    ["https://[::1]/a.csv", /non-public/],
    ["https://[::ffff:10.0.0.1]/a.csv", /non-public/],
    ["https://2130706433/a.csv", /non-public|not a public/],       // decimal form of 127.0.0.1
    ["https://0x7f.0.0.1/a.csv", /non-public|not a public/],       // hex octet
    ["not a url", /valid URL/],
  ])("refuses %s", async (url, reason) => {
    await expect(assertPublicUrl(url, { resolver: publicDns })).rejects.toThrow(reason);
  });

  it("refuses a public-looking name that resolves to an internal address", async () => {
    await expect(assertPublicUrl("https://feeds.example.com/a.csv", { resolver: resolvesTo("10.1.2.3") })).rejects.toThrow(/non-public/);
    await expect(assertPublicUrl("https://feeds.example.com/a.csv", { resolver: resolvesTo("169.254.169.254") })).rejects.toThrow(/non-public/);
  });

  it("refuses when any one of several answers is internal (rebinding-style mixed answer)", async () => {
    await expect(assertPublicUrl("https://feeds.example.com/a.csv", { resolver: resolvesTo("93.184.216.34", "127.0.0.1") })).rejects.toThrow(/non-public/);
  });

  it("refuses unresolvable hosts", async () => {
    await expect(assertPublicUrl("https://feeds.example.com/a.csv", { resolver: async () => { throw new Error("ENOTFOUND"); } })).rejects.toThrow(/resolve/);
    await expect(assertPublicUrl("https://feeds.example.com/a.csv", { resolver: resolvesTo() })).rejects.toThrow(/resolve/);
  });
});

describe("feed secrets", () => {
  it("substitutes FEED_* variables, URL-encoded", () => {
    expect(resolveSecrets("https://x.example/feed/${FEED_KEY}/a.csv", { FEED_KEY: "ab/c d" })).toBe("https://x.example/feed/ab%2Fc%20d/a.csv");
  });
  it("refuses any other variable, so a feed URL cannot leak application secrets", () => {
    expect(() => resolveSecrets("https://evil.example/?x=${DATABASE_URL}", { DATABASE_URL: "postgres://secret" })).toThrow(/FEED_/);
    expect(() => resolveSecrets("https://evil.example/?x=${ADMIN_TOKEN}", { ADMIN_TOKEN: "t" })).toThrow(/FEED_/);
  });
  it("fails clearly when the variable is missing", () => {
    expect(() => resolveSecrets("https://x.example/${FEED_MISSING}", {})).toThrow(/not set/);
  });
});

describe("offer links", () => {
  const base = { externalId: "1", title: "Something EDP 50 ml", priceMinor: 100, currency: "PLN", availability: "IN_STOCK" };
  it("rejects non-web URL schemes coming from a feed", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<script>1</script>", "file:///etc/passwd"]) {
      expect(rawOfferSchema.safeParse({ ...base, url }).success).toBe(false);
    }
    expect(rawOfferSchema.safeParse({ ...base, url: "https://shop.example/p/1" }).success).toBe(true);
    expect(rawOfferSchema.safeParse({ ...base, url: "https://shop.example/p/1", imageUrl: "javascript:1" }).success).toBe(false);
  });
});

describe("feed downloader (local server, test-only private access)", () => {
  let server: http.Server;
  let other: http.Server;
  let base = "";
  let otherBase = "";
  const seenAuth: (string | undefined)[] = [];
  const policy = { allowPrivateForTests: true };

  beforeAll(async () => {
    other = http.createServer((req, res) => { seenAuth.push(req.headers["x-feed-key"] as string | undefined); res.end("id,title\n9,from other host"); });
    await new Promise<void>((r) => other.listen(0, "127.0.0.1", r));
    otherBase = `http://127.0.0.1:${(other.address() as AddressInfo).port}`;
    server = http.createServer((req, res) => {
      const path = req.url ?? "/";
      if (path === "/ok") res.end("﻿id,title\n1,plain");
      else if (path === "/gz") res.end(gzipSync("id,title\n2,gzipped"));
      else if (path === "/big") res.end(Buffer.alloc(200_000, 97));
      else if (path === "/bomb") res.end(gzipSync(Buffer.alloc(5_000_000, 97)));
      else if (path === "/slow") setTimeout(() => res.end("late"), 2000);
      else if (path === "/loop") res.writeHead(302, { Location: "/loop" }).end();
      else if (path === "/hop") res.writeHead(302, { Location: "/ok" }).end();
      else if (path === "/cross") res.writeHead(302, { Location: `${otherBase}/x` }).end();
      else if (path === "/auth") res.end(String(req.headers["x-feed-key"] ?? "none"));
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => { server.close(); other.close(); });

  it("refuses the same local server under the production policy", async () => {
    await expect(fetchFeed(`${base}/ok`)).rejects.toThrow(/https/);
    await expect(fetchFeed(`${base.replace("http:", "https:")}/ok`)).rejects.toThrow(/port|non-public/);
  });

  it("downloads plain and gzip bodies and strips the BOM", async () => {
    expect(await fetchFeed(`${base}/ok`, { policy })).toBe("id,title\n1,plain");
    expect(await fetchFeed(`${base}/gz`, { policy })).toBe("id,title\n2,gzipped");
  });

  it("enforces the download size limit", async () => {
    await expect(fetchFeed(`${base}/big`, { policy, maxBytes: 50_000 })).rejects.toThrow(/limit/);
  });

  it("enforces the limit on decompressed size (gzip bomb)", async () => {
    await expect(fetchFeed(`${base}/bomb`, { policy, maxBytes: 100_000 })).rejects.toThrow(/limit/);
  });

  it("enforces the time limit", async () => {
    await expect(fetchFeed(`${base}/slow`, { policy, timeoutMs: 300 })).rejects.toThrow(/timed out/);
  });

  it("follows a bounded number of redirects", async () => {
    expect(await fetchFeed(`${base}/hop`, { policy })).toBe("id,title\n1,plain");
    await expect(fetchFeed(`${base}/loop`, { policy })).rejects.toThrow(/redirected more than/);
  });

  it("sends the auth header to the original host but not to a redirect target", async () => {
    expect(await fetchFeed(`${base}/auth`, { policy, authHeader: "X-Feed-Key: s3cret" })).toBe("s3cret");
    expect(await fetchFeed(`${base}/cross`, { policy, authHeader: "X-Feed-Key: s3cret" })).toContain("from other host");
    expect(seenAuth).toEqual([undefined]);
  });

  it("reports HTTP errors with the host only", async () => {
    await expect(fetchFeed(`${base}/missing?apikey=TOPSECRET`, { policy })).rejects.toThrow(/HTTP 404/);
    await fetchFeed(`${base}/missing?apikey=TOPSECRET`, { policy }).catch((e: Error) => expect(e.message).not.toContain("TOPSECRET"));
  });
});
