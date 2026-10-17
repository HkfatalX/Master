'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[craftforge] erro de renderização:', error)
  }, [error])

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-content-center px-4 text-center">
      <span className="text-6xl">💥</span>
      <h1 className="mt-5 text-3xl font-black text-white">Algo quebrou por aqui</h1>
      <p className="mt-2 text-slate-400">
        Um erro inesperado aconteceu. Você pode tentar de novo — seus projetos continuam salvos.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Tentar novamente
        </button>
        <a href="/" className="btn-secondary">
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
