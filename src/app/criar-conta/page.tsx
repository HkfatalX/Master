'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { AuthShell, FieldError, FormAlert } from '@/components/AuthShell'
import { api } from '@/lib/client'

type Strength = { score: number; label: string; color: string }

function strengthOf(password: string): Strength {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 2) return { score, label: 'Fraca', color: 'bg-red-500' }
  if (score === 3) return { score, label: 'Média', color: 'bg-ember-500' }
  if (score === 4) return { score, label: 'Boa', color: 'bg-grass-500' }
  return { score, label: 'Forte', color: 'bg-grass-400' }
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accept, setAccept] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const strength = useMemo(() => strengthOf(password), [password])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (!accept) {
      setError('Você precisa aceitar os termos para continuar.')
      return
    }

    setBusy(true)
    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: { email, username, displayName: displayName || username, password },
      })
      router.push('/painel')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar sua conta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Grátis, sem cartão. Seus projetos ficam salvos e sincronizados."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/entrar" className="font-semibold text-grass-400 hover:text-grass-300">
            Entrar
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
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="username" className="label">Nome de usuário</label>
              <input
                id="username"
                autoComplete="username"
                required
                className="input"
                placeholder="seu_nome"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">3–20 caracteres: letras, números e _</p>
            </div>
            <div>
              <label htmlFor="displayName" className="label">Nome exibido</label>
              <input
                id="displayName"
                className="input"
                placeholder="Como aparecer"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">Opcional</p>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">Senha</label>
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
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full ${strength.color} transition-all`}
                    style={{ width: `${Math.max(12, (strength.score / 5) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-400">{strength.label}</span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">Pelo menos uma letra e um número.</p>
          </div>

          <div>
            <label htmlFor="confirm" className="label">Confirmar senha</label>
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

          <label className="flex items-start gap-2.5 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-950 accent-grass-500"
            />
            <span>
              Concordo com os termos de uso e entendo que o CraftForge é uma ferramenta independente,
              sem vínculo com Mojang ou Microsoft.
            </span>
          </label>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Criando conta…' : 'Criar conta grátis'}
        </button>
      </form>
    </AuthShell>
  )
}
