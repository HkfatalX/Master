'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { api, formatDate, initials } from '@/lib/client'
import type { SessionUser } from '@/lib/session'

type SessionRow = {
  id: string
  created_at: string
  expires_at: string
  ip: string | null
  user_agent: string | null
}

const COLORS = ['#3fc95c', '#4aa8ff', '#ffb545', '#ff6b6b', '#b06bff', '#2fd4c4', '#f472b6', '#e0453f']

export function ProfileClient({
  user,
  sessions,
  projectCount,
}: {
  user: SessionUser
  sessions: SessionRow[]
  projectCount: number
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio)
  const [avatarColor, setAvatarColor] = useState(user.avatarColor)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileBusy, setProfileBusy] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordBusy, setPasswordBusy] = useState(false)

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setProfileBusy(true)
    setProfileMessage(null)
    setProfileError(null)
    try {
      await api('/api/profile', {
        method: 'PATCH',
        body: { displayName, bio, avatarColor },
      })
      setProfileMessage('Perfil atualizado.')
      router.refresh()
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setProfileBusy(false)
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    setPasswordBusy(true)
    setPasswordMessage(null)
    setPasswordError(null)
    try {
      await api('/api/profile', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      setPasswordMessage('Senha alterada. Suas outras sessões foram encerradas.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-white">Minha conta</h1>
      <p className="mt-1.5 text-sm text-slate-400">Gerencie seus dados, segurança e sessões ativas.</p>

      {/* Cartão do perfil */}
      <div className="card mt-6 flex flex-wrap items-center gap-5 p-6">
        <span
          className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-black text-ink-950"
          style={{ backgroundColor: avatarColor }}
        >
          {initials(displayName || user.username)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-white">{displayName}</p>
          <p className="text-sm text-slate-400">
            @{user.username} · {user.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`chip ${
                user.emailVerified
                  ? 'border-grass-500/30 bg-grass-500/10 text-grass-300'
                  : 'border-ember-500/30 bg-ember-500/10 text-ember-400'
              }`}
            >
              {user.emailVerified ? '✓ E-mail confirmado' : 'E-mail não confirmado'}
            </span>
            <span className="chip">📁 {projectCount} projetos</span>
            <span className="chip">Conta desde {formatDate(user.createdAt)}</span>
          </div>
        </div>
        {!user.emailVerified && (
          <Link href="/verificar" className="btn-secondary">
            Confirmar e-mail
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Perfil */}
        <form onSubmit={saveProfile} className="card space-y-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-grass-400">Dados do perfil</h2>

          {profileMessage && (
            <div className="rounded-xl border border-grass-500/30 bg-grass-500/10 px-3.5 py-2.5 text-sm text-grass-300">
              {profileMessage}
            </div>
          )}
          {profileError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {profileError}
            </div>
          )}

          <label className="block">
            <span className="label">Nome exibido</span>
            <input className="input" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} />
          </label>

          <label className="block">
            <span className="label">Bio</span>
            <textarea
              className="input min-h-[80px]"
              value={bio}
              maxLength={280}
              placeholder="Conte o que você cria…"
              onChange={(e) => setBio(e.target.value)}
            />
            <span className="mt-1.5 block text-[11px] text-slate-500">{bio.length}/280</span>
          </label>

          <div>
            <span className="label">Cor do avatar</span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                    avatarColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={profileBusy}>
            {profileBusy ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>

        {/* Senha */}
        <form onSubmit={changePassword} className="card space-y-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ember-400">Segurança</h2>

          {passwordMessage && (
            <div className="rounded-xl border border-grass-500/30 bg-grass-500/10 px-3.5 py-2.5 text-sm text-grass-300">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {passwordError}
            </div>
          )}

          <label className="block">
            <span className="label">Senha atual</span>
            <input
              type="password"
              className="input"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="label">Nova senha</span>
            <input
              type="password"
              className="input"
              value={newPassword}
              autoComplete="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <span className="mt-1.5 block text-[11px] text-slate-500">
              Mínimo 8 caracteres, com letra e número.
            </span>
          </label>

          <button type="submit" className="btn-secondary w-full" disabled={passwordBusy || !currentPassword || !newPassword}>
            {passwordBusy ? 'Alterando…' : 'Alterar senha'}
          </button>

          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-500">
            Suas senhas são guardadas com <strong className="text-slate-300">scrypt</strong> (salt próprio por
            conta). Alterar a senha encerra todas as outras sessões.
          </p>
        </form>
      </div>

      {/* Sessões */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Sessões ativas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Cada dispositivo logado tem um token próprio, revogável a qualquer momento.
          </p>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="text-slate-400">🖥️</span>
              <span className="min-w-0 flex-1 truncate text-slate-300">
                {session.user_agent?.slice(0, 60) || 'Dispositivo desconhecido'}
              </span>
              <span className="font-mono text-xs text-slate-500">{session.ip ?? 'ip ?'}</span>
              <span className="text-xs text-slate-500">expira {formatDate(session.expires_at)}</span>
            </li>
          ))}
          {sessions.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Nenhuma sessão.</li>}
        </ul>
      </div>
    </div>
  )
}
