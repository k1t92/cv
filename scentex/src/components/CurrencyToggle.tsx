"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const CURRENCIES = ["PLN", "EUR"] as const;

export function CurrencyToggle({ current, cookieName }: { current: "PLN" | "EUR"; cookieName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Display currency" className={`flex rounded-md border border-line p-0.5 ${pending ? "opacity-60" : ""}`}>
      {CURRENCIES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={current === code}
          onClick={() => {
            if (code === current) return;
            document.cookie = `${cookieName}=${code}; path=/; max-age=31536000; samesite=lax`;
            start(() => router.refresh());
          }}
          className={`num rounded px-2 py-1 text-xs ${current === code ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
