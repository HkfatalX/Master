export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-white/5" />
      <div className="mt-4 h-5 w-96 animate-pulse rounded-lg bg-white/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  )
}
