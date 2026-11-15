import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "scentex_admin";

const digest = (value: string) => createHash("sha256").update(`scentex:${value}`).digest();

export function adminConfigured(): boolean {
  return (process.env.ADMIN_TOKEN ?? "").length >= 12;
}

export function tokenMatches(candidate: string): boolean {
  if (!adminConfigured()) return false;
  return timingSafeEqual(digest(candidate), digest(process.env.ADMIN_TOKEN!));
}

export function sessionValue(): string {
  return digest(process.env.ADMIN_TOKEN!).toString("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const expected = sessionValue();
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

/** Gate for every admin page and action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
