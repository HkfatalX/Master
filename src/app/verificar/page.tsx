'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { AuthShell, FormAlert } from '@/components/AuthShell'
import { api } from '@/lib/client'

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<'idle' | 'checking' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setStatus('checking')

    api<{ ok: boolean; email: string }>('/api/auth/verify', { method: 'POST', body: { token } })
      .then((result) => {
        if (cancelled) return
        setStatus('done')
        setEmail(result.email ?? null)
        router.refresh()
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Link inválido.')
      })

    return () => {
      cancelled = true
    }
  }, [token, router])

  async function resend() {
    try {
      await api('/api/auth/verify', { method: 'POST', body: { resend: true } })
      setMessage('Novo link enviado. Confira a caixa de entrada.')
      setStatus('idle')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível reenviar.')
    }
  }

  return (
    <AuthShell
      title="Confirmar e-mail"
      subtitle="Confirmar o e-mail libera publicação na biblioteca e recuperação de conta."
      footer={
        <Link href="/painel" className="font-semibold text-grass-400 hover:text-grass-300">
          Ir para meus projetos
        </Link>
      }
    >
      {status === 'checking' && (
        <p className="flex items-center gap-2.5 text-sm text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-grass-500 border-t-transparent" />
          Confirmando seu e-mail…
        </p>
      )}

      {status === 'done' && (
        <>
          <FormAlert message="E-mail confirmado com sucesso!" tone="success" />
          {email && <p className="text-sm text-slate-400">{email} está verificado.</p>}
        </>
      )}

      {status === 'error' && <FormAlert message={message} />}

      {status === 'idle' && (
        <>
          {message && <FormAlert message={message} />}
          <p className="text-sm leading-relaxed text-slate-400">
            Abra o link que enviamos para o seu e-mail (ele também aparece na sua{' '}
            <Link href="/caixa-de-entrada" className="font-semibold text-grass-400 hover:underline">
              caixa de entrada
            </Link>
            ). O link vale por 24 horas.
          </p>
          <button type="button" onClick={resend} className="btn-secondary mt-5 w-full">
            Reenviar link de confirmação
          </button>
        </>
      )}
    </AuthShell>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <VerifyForm />
    </Suspense>
  )
}
