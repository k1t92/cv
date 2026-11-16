import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Apply migrations to the dedicated test schema. Runs in the main process, so the URL is derived here as well. */
export default function setup() {
  const base = process.env.DATABASE_URL ?? readFileSync(path.join(process.cwd(), ".env"), "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
  if (!base) throw new Error("DATABASE_URL is not configured");
  const url = new URL(base);
  url.searchParams.set("schema", "scentex_test");
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url.toString() } });
}
