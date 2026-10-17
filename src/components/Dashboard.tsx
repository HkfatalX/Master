'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { api, formatRelative } from '@/lib/client'
import { CATEGORIES, DEFAULT_TARGET_VERSION } from '@/lib/minecraft'
import type { SessionUser } from '@/lib/session'

export type DashboardProject = {
  id: string
  name: string
  slug: string
  summary: string
  kind: string
  category: string
  namespace: string
  targetVersion: string
  icon: string | null
  revision: number
  visibility: string
  downloads: number
  likeCount: number
  viewCount: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

const TEMPLATES = [
  {
    id: 'starter',
    name: 'Addon inicial',
    emoji: '🍎',
    text: 'Item + bloco + receita já funcionando. Melhor ponto de partida.',
  },
  { id: 'mob', name: 'Mob personalizado', emoji: '🐉', text: 'Criatura com modelo, IA, drops e ovo de spawn.' },
  { id: 'world', name: 'Mundo', emoji: '🌍', text: 'Configuração de mundo + packs aplicados.' },
  { id: 'blank', name: 'Em branco', emoji: '📄', text: 'Comece do zero, sem nada pré-criado.' },
] as const

export function Dashboard({
  user,
  projects,
  used,
  limit,
}: {
  user: SessionUser
  projects: DashboardProject[]
  used: number
  limit: number
}) {
  const router = useRouter()
  const [items, setItems] = useState(projects)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<string>('starter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState<{ id: string; message: string; createdAt: string; username: string | null }[]>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!('EventSource' in window)) return
    const source = new EventSource('/api/stream')
    source.addEventListener('ready', () => setLive(true))
    const onAny = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { message?: string; actor?: string | null }
        if (!payload.message) return
        setActivity((prev) =>
          [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              message: `${payload.actor ? `${payload.actor} ` : ''}${payload.message}`,
              createdAt: new Date().toISOString(),
              username: payload.actor ?? null,
            },
            ...prev,
          ].slice(0, 8),
        )
      } catch {
        /* ignora */
      }
    }
    for (const type of ['project.create', 'project.save', 'project.publish', 'project.like', 'user.signup']) {
      source.addEventListener(type, onAny as EventListener)
    }
    source.onerror = () => setLive(false)
    return () => source.close()
  }, [])

  const totals = useMemo(() => {
    const items = [...projects]
    return {
      total: items.length,
      public: items.filter((p) => p.visibility === 'public').length,
      downloads: items.reduce((sum, p) => sum + p.downloads, 0),
      likes: items.reduce((sum, p) => sum + p.likeCount, 0),
    }
  }, [projects])

  async function createProject() {
    if (busy || name.trim().length < 2) return
    setBusy(true)
    setError(null)
    try {
      const created = await api<{ id: string }>('/api/projects', {
        method: 'POST',
        body: { name: name.trim(), template },
      })
      router.push(`/editor/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o projeto.')
      setBusy(false)
    }
  }

  async function duplicate(id: string) {
    try {
      const result = await api<{ id: string }>(`/api/projects/${id}/publish`, { method: 'PUT' })
      router.refresh()
      return result.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível duplicar.')
    }
  }

  async function remove(id: string, projectName: string) {
    if (!window.confirm(`Excluir "${projectName}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((p) => p.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  async function toggleVisibility(id: string, current: string) {
    const next = current === 'public' ? 'private' : 'public'
    try {
      await api(`/api/projects/${id}/publish`, { method: 'POST', body: { visibility: next } })
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, visibility: next } : p)))
      setError(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a visibilidade.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Olá, {user.displayName.split(' ')[0]} 👋
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {used} de {limit} projetos usados · alvo padrão{' '}
            <span className="font-mono text-grass-400">Minecraft {DEFAULT_TARGET_VERSION}</span>
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + Novo projeto
        </button>
      </div>

      {!user.emailVerified && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-400">
          <span className="flex-1">
            Confirme seu e-mail para publicar na biblioteca e recuperar a conta com segurança.
          </span>
          <Link href="/verificar" className="btn-secondary px-3 py-1.5 text-xs">
            Confirmar agora
          </Link>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Estatísticas */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Projetos', value: totals.total, icon: '📁' },
          { label: 'Publicados', value: totals.public, icon: '🌍' },
          { label: 'Downloads', value: totals.downloads, icon: '⬇️' },
          { label: 'Curtidas', value: totals.likes, icon: '❤️' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</span>
              <span>{item.icon}</span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-white">{item.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Projetos */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">Meus projetos</h2>

          {items.length === 0 ? (
            <div className="card grid place-items-center p-14 text-center">
              <span className="text-5xl">⛏️</span>
              <p className="mt-4 text-lg font-bold text-white">Nenhum projeto ainda</p>
              <p className="mt-1.5 max-w-sm text-sm text-slate-400">
                Crie seu primeiro addon — o modelo inicial já vem com item, bloco e receita prontos.
              </p>
              <button type="button" className="btn-primary mt-6" onClick={() => setCreating(true)}>
                Criar meu primeiro addon
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((project) => {
                const category = CATEGORIES.find((c) => c.id === project.category)
                return (
                  <div key={project.id} className="card card-hover group flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink-950/60 text-xl">
                        {project.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.icon} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>{category?.emoji ?? '📦'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/editor/${project.id}`}
                          className="block truncate font-bold text-white hover:text-grass-400"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {project.namespace} · v{project.revision} · {formatRelative(project.updatedAt)}
                        </p>
                      </div>
                      <span
                        className={`chip shrink-0 ${
                          project.visibility === 'public'
                            ? 'border-grass-500/30 bg-grass-500/10 text-grass-300'
                            : 'border-white/10 text-slate-400'
                        }`}
                      >
                        {project.visibility === 'public' ? 'Público' : 'Privado'}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-400">{project.summary || 'Sem descrição.'}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>⬇️ {project.downloads}</span>
                      <span>❤️ {project.likeCount}</span>
                      <span>👁️ {project.viewCount}</span>
                      <span className="font-mono">{project.targetVersion}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
                      <Link href={`/editor/${project.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                        Abrir editor
                      </Link>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => {
                          window.location.href = `/api/projects/${project.id}/export?format=mcaddon`
                        }}
                      >
                        Baixar
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => void toggleVisibility(project.id, project.visibility)}
                      >
                        {project.visibility === 'public' ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => void duplicate(project.id)}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        onClick={() => void remove(project.id, project.name)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Atividade em tempo real */}
        <aside>
          <div className="card sticky top-20 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <h2 className="text-sm font-bold text-white">Atividade</h2>
              <span className={`chip ${live ? 'border-grass-500/30 bg-grass-500/10 text-grass-300' : 'text-slate-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-grass-400' : 'bg-slate-600'}`} />
                {live ? 'ao vivo' : 'offline'}
              </span>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto p-3">
              {activity.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs leading-relaxed text-slate-500">
                  Nada ainda. As ações da comunidade aparecem aqui em tempo real.
                </p>
              ) : (
                activity.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <p className="text-xs text-slate-300">{entry.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{formatRelative(entry.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/[0.07] px-4 py-3">
              <Link href="/biblioteca" className="btn-secondary w-full py-2 text-xs">
                Explorar biblioteca
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de criação */}
      {creating && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-white/[0.07] px-5 py-4">
              <h3 className="text-lg font-bold text-white">Novo projeto</h3>
              <p className="mt-0.5 text-sm text-slate-400">Escolha um nome e um ponto de partida.</p>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="label">Nome do projeto</span>
                <input
                  className="input"
                  value={name}
                  maxLength={60}
                  autoFocus
                  placeholder="Ex.: Arsenal de Rubi"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void createProject()
                  }}
                />
                <span className="mt-1.5 block text-[11px] text-slate-500">
                  Namespace sugerido:{' '}
                  <code className="kbd">
                    {name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 16) || 'forge'}
                  </code>
                </span>
              </label>

              <div>
                <span className="label">Modelo inicial</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTemplate(option.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        template === option.id
                          ? 'border-grass-500/50 bg-grass-500/10'
                          : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <span>{option.emoji}</span>
                        {option.name}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{option.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)} disabled={busy}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void createProject()}
                disabled={busy || name.trim().length < 2}
              >
                {busy ? 'Criando…' : 'Criar projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
