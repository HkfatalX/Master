import Link from 'next/link'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-grass-500/15 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-grass-400 to-grass-600 text-xl font-black text-ink-950">
              ⛏
            </span>
            <span className="text-xl font-extrabold text-white">
              Craft<span className="text-grass-400">Forge</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="card p-6">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  )
}

export function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
      <span>⚠</span>
      <span>{message}</span>
    </p>
  )
}

export function FormAlert({ message, tone = 'error' }: { message: string | null; tone?: 'error' | 'success' }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm ${
        tone === 'success'
          ? 'border-grass-500/30 bg-grass-500/10 text-grass-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {message}
    </div>
  )
}
