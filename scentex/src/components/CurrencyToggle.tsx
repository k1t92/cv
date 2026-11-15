"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface Option { value: string; label: string; activeClass?: string }

/** Segmented control that stores a preference in a cookie and re-renders the server components. */
export function CookieToggle({ current, cookieName, options, label }: { current: string; cookieName: string; options: Option[]; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={label} className={`flex rounded-md border border-line p-0.5 ${pending ? "opacity-60" : ""}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={current === option.value}
          onClick={() => {
            if (option.value === current) return;
            document.cookie = `${cookieName}=${option.value}; path=/; max-age=31536000; samesite=lax`;
            start(() => router.refresh());
          }}
          className={`num rounded px-2 py-1 text-xs ${current === option.value ? option.activeClass ?? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
