'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { AuthShell, FormAlert } from '@/components/AuthShell'
import { api } from '@/lib/client'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (!token) {
      setError('Link inválido. Peça um novo link de redefinição.')
      return
    }

    setBusy(true)
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password } })
      router.push('/painel')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Link inválido"
        subtitle="Abra o link que enviamos por e-mail, ou peça um novo."
        footer={
          <Link href="/esqueci-senha" className="font-semibold text-grass-400 hover:text-grass-300">
            Pedir novo link
          </Link>
        }
      >
        <FormAlert message="Este link de redefinição está incompleto." />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Definir nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <form onSubmit={onSubmit}>
        <FormAlert message={error} />

        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="label">Nova senha</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Pelo menos uma letra e um número.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirmar nova senha</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ResetForm />
    </Suspense>
  )
}
