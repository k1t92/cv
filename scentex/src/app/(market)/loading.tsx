export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-72" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-96 w-full" />
    </div>
  );
}
