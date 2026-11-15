import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-line bg-panel p-8 text-center">
      <p className="label">404</p>
      <h1 className="mt-2 text-lg font-medium">This fragrance is not tracked</h1>
      <p className="mt-2 text-sm text-muted">The page does not exist or the product has been removed.</p>
      <Link href="/perfumes" className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">Browse perfumes</Link>
    </div>
  );
}
