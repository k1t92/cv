import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

/** Integration tests run against a separate PostgreSQL schema of the configured database, never the app's own. */
function testDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL ?? readFileSync(path.join(import.meta.dirname, ".env"), "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
  if (!fromEnv) throw new Error("DATABASE_URL is not configured");
  const url = new URL(fromEnv);
  url.searchParams.set("schema", "scentex_test");
  return url.toString();
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    env: { DATABASE_URL: testDatabaseUrl(), BOT_CONTACT: "tests@scentex.invalid" },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
