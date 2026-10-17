import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-content-center px-4 text-center">
      <span className="text-6xl">🧱</span>
      <h1 className="mt-5 text-3xl font-black text-white">Bloco não encontrado</h1>
      <p className="mt-2 text-slate-400">
        Esta página não existe, foi removida ou você não tem permissão para vê-la.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/" className="btn-primary">
          Ir para o início
        </Link>
        <Link href="/biblioteca" className="btn-secondary">
          Ver biblioteca
        </Link>
      </div>
    </div>
  )
}
