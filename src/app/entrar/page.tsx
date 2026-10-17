'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { AuthShell, FieldError, FormAlert } from '@/components/AuthShell'
import { api } from '@/lib/client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/painel'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setFieldErrors({})

    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } })
      router.push(next.startsWith('/') ? next : '/painel')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar.'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acesse seus addons, mundos e texturas salvos."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link href="/criar-conta" className="font-semibold text-grass-400 hover:text-grass-300">
            Criar agora — é grátis
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormAlert message={error} />

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="label">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError message={fieldErrors.email ?? null} />
          </div>

          <div>
            <label htmlFor="password" className="label">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <FieldError message={fieldErrors.password ?? null} />
          </div>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-4 text-center text-sm">
          <Link href="/esqueci-senha" className="text-slate-400 hover:text-slate-200">
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginForm />
    </Suspense>
  )
}
