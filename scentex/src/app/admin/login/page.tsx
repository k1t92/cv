import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { login } from "../actions";
import { Flash, input } from "../ui";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-line bg-panel p-6">
      <h1 className="text-lg font-medium">Admin sign-in</h1>
      {!adminConfigured() ? (
        <p className="text-sm text-muted">The admin panel is disabled. Set <code className="num text-ink">ADMIN_TOKEN</code> (12+ characters) in the environment and restart the app.</p>
      ) : (
        <form action={login} className="space-y-3">
          <Flash search={await searchParams} />
          <label className="block space-y-1"><span className="label">Admin token</span><input name="token" type="password" required autoComplete="current-password" className={input} /></label>
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">Sign in</button>
        </form>
      )}
    </div>
  );
}
