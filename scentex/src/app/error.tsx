"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-lg border border-line bg-panel p-8 text-center">
      <h1 className="text-lg font-medium">Market data is unavailable</h1>
      <p className="mt-2 text-sm text-muted">The page could not load its data. This usually means the database is unreachable.</p>
      {error.digest && <p className="num mt-2 text-xs text-faint">Ref {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">Try again</button>
    </div>
  );
}
