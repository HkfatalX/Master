'use client'

import Link from 'next/link'
import { useState } from 'react'

import { AuthShell, FormAlert } from '@/components/AuthShell'
import { api } from '@/lib/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await api<{ message: string }>('/api/auth/forgot', {
        method: 'POST',
        body: { email },
      })
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviamos um link de redefinição para o seu e-mail."
      footer={
        <>
          Lembrou a senha?{' '}
          <Link href="/entrar" className="font-semibold text-grass-400 hover:text-grass-300">
            Voltar para o login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <FormAlert message={error} />
        {message && <FormAlert message={message} tone="success" />}

        <label htmlFor="email" className="label">E-mail da conta</label>
        <input
          id="email"
          type="email"
          required
          className="input"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar link de redefinição'}
        </button>

        <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-500">
          O link aparece na sua{' '}
          <Link href="/caixa-de-entrada" className="font-semibold text-grass-400 hover:underline">
            caixa de entrada
          </Link>{' '}
          aqui mesmo no site (o ambiente de preview não envia e-mails de verdade).
        </p>
      </form>
    </AuthShell>
  )
}
