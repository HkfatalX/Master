'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { api, formatBytes, formatRelative, initials } from '@/lib/client'
import { CATEGORIES } from '@/lib/minecraft'
import type { ProjectData } from '@/lib/generator/types'

export type ProjectDetail = {
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
  updatedAt: string
  data: ProjectData
  author: { id: string; username: string; displayName: string; avatarColor: string; bio: string } | null
}

export function ProjectPage({
  project,
  fileCount,
  totalSize,
  liked,
  comments,
  isOwner,
  isAuthenticated,
}: {
  project: ProjectDetail
  fileCount: number
  totalSize: number
  liked: boolean
  comments: { id: string; body: string; created_at: string; username: string; display_name: string; avatar_color: string }[]
  isOwner: boolean
  isAuthenticated: boolean
}) {
  const router = useRouter()
  const [likes, setLikes] = useState(project.likeCount)
  const [hasLiked, setHasLiked] = useState(liked)
  const [likeBusy, setLikeBusy] = useState(false)
  const [list, setList] = useState(comments)
  const [body, setBody] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = CATEGORIES.find((c) => c.id === project.category)
  const counts = {
    items: project.data.items.length,
    blocks: project.data.blocks.length,
    entities: project.data.entities.length,
    recipes: project.data.recipes.length,
  }

  async function toggleLike() {
    if (likeBusy) return
    if (!isAuthenticated) {
      router.push(`/entrar?next=/biblioteca/${project.slug}`)
      return
    }
    setLikeBusy(true)
    try {
      const result = await api<{ liked: boolean; count: number }>(`/api/library/${project.slug}/like`, {
        method: 'POST',
      })
      setLikes(result.count)
      setHasLiked(result.liked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível curtir.')
    } finally {
      setLikeBusy(false)
    }
  }

  async function sendComment(event: React.FormEvent) {
    event.preventDefault()
    if (commentBusy || body.trim().length < 1) return
    if (!isAuthenticated) {
      router.push(`/entrar?next=/biblioteca/${project.slug}`)
      return
    }
    setCommentBusy(true)
    try {
      const result = await api<{
        comments: { id: string; body: string; created_at: string; username: string; display_name: string; avatar_color: string }[]
      }>(`/api/library/${project.slug}/comments`, { method: 'POST', body: { body } })
      setList(result.comments)
      setBody('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível comentar.')
    } finally {
      setCommentBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/biblioteca" className="text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para a biblioteca
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {/* Cabeçalho */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-start gap-5 p-6">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60 text-4xl">
                {project.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.icon} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{category?.emoji ?? '📦'}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{project.name}</h1>
                  <span className="chip border-grass-500/30 bg-grass-500/10 font-mono text-grass-300">
                    {project.targetVersion}
                  </span>
                  {project.visibility === 'private' && (
                    <span className="chip border-ember-500/30 bg-ember-500/10 text-ember-400">Privado</span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{project.summary}</p>

                {project.author && (
                  <div className="mt-4 flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-ink-950"
                      style={{ backgroundColor: project.author.avatarColor }}
                    >
                      {initials(project.author.displayName)}
                    </span>
                    <span className="text-sm text-slate-300">
                      {project.author.displayName}
                      <span className="text-slate-500"> @{project.author.username}</span>
                    </span>
                    <span className="text-xs text-slate-600">· atualizado {formatRelative(project.updatedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] bg-white/[0.015] px-6 py-4">
              <a
                href={`/api/projects/${project.id}/export?format=mcaddon`}
                className="btn-primary"
                download
              >
                ⬇️ Baixar .mcaddon
              </a>
              <a href={`/api/projects/${project.id}/export?format=zip`} className="btn-secondary" download>
                Baixar .zip
              </a>
              <button
                type="button"
                onClick={() => void toggleLike()}
                className={`btn-secondary ${hasLiked ? 'border-red-500/40 bg-red-500/10 text-red-300' : ''}`}
                disabled={likeBusy}
              >
                {hasLiked ? '❤️' : '🤍'} {likes}
              </button>
              {isOwner && (
                <Link href={`/editor/${project.id}`} className="btn-secondary">
                  Abrir no editor
                </Link>
              )}
            </div>
          </div>

          {/* Conteúdo do addon */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Itens', value: counts.items, icon: '🍎' },
              { label: 'Blocos', value: counts.blocks, icon: '🧱' },
              { label: 'Mobs', value: counts.entities, icon: '🐉' },
              { label: 'Receitas', value: counts.recipes, icon: '⚗️' },
            ].map((item) => (
              <div key={item.label} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</span>
                  <span>{item.icon}</span>
                </div>
                <p className="mt-1.5 text-2xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Listas */}
          {(counts.items > 0 || counts.blocks > 0 || counts.entities > 0) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {counts.items > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-grass-400">Itens</h2>
                  <ul className="space-y-1.5">
                    {project.data.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-slate-200">{item.displayName}</span>
                        <code className="shrink-0 font-mono text-[11px] text-slate-500">
                          {project.namespace}:{item.key}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {counts.blocks > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-grass-400">Blocos</h2>
                  <ul className="space-y-1.5">
                    {project.data.blocks.map((block) => (
                      <li key={block.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-slate-200">{block.displayName}</span>
                        <code className="shrink-0 font-mono text-[11px] text-slate-500">
                          {project.namespace}:{block.key}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {counts.entities > 0 && (
                <div className="card p-5 sm:col-span-2">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-grass-400">Criaturas</h2>
                  <ul className="space-y-1.5">
                    {project.data.entities.map((entity) => (
                      <li key={entity.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-slate-200">
                          {entity.displayName}
                          <span className="ml-2 text-[11px] text-slate-500">
                            {entity.isHostile ? 'hostil' : 'pacífica'} · {entity.health} HP
                          </span>
                        </span>
                        <code className="shrink-0 font-mono text-[11px] text-slate-500">
                          {project.namespace}:{entity.key}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Comentários */}
          <div className="card mt-6 p-5">
            <h2 className="mb-4 text-lg font-bold text-white">
              Comentários <span className="text-slate-500">({list.length})</span>
            </h2>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={sendComment} className="mb-5">
              <textarea
                className="input min-h-[84px]"
                placeholder={isAuthenticated ? 'Deixe um comentário…' : 'Entre na sua conta para comentar.'}
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{body.length}/500</span>
                <button type="submit" className="btn-primary px-4 py-2 text-xs" disabled={commentBusy || !body.trim()}>
                  {commentBusy ? 'Enviando…' : 'Comentar'}
                </button>
              </div>
            </form>

            {list.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Nenhum comentário ainda.</p>
            ) : (
              <ul className="space-y-3">
                {list.map((comment) => (
                  <li key={comment.id} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-ink-950"
                      style={{ backgroundColor: comment.avatar_color }}
                    >
                      {initials(comment.display_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-300">{comment.display_name}</span> ·{' '}
                        {formatRelative(comment.created_at)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Lateral */}
        <aside>
          <div className="card sticky top-20 overflow-hidden">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <h2 className="text-sm font-bold text-white">Detalhes do pacote</h2>
            </div>
            <dl className="divide-y divide-white/[0.05] text-sm">
              {[
                ['Categoria', `${category?.emoji ?? '📦'} ${category?.label ?? project.category}`],
                ['Namespace', project.namespace],
                ['Versão alvo', project.targetVersion],
                ['Arquivos gerados', String(fileCount)],
                ['Tamanho total', formatBytes(totalSize)],
                ['Revisão', `v${project.revision}`],
                ['Downloads', project.downloads.toLocaleString('pt-BR')],
                ['Visualizações', project.viewCount.toLocaleString('pt-BR')],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-mono text-xs text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-white/[0.07] px-4 py-3">
              <a href={`/api/projects/${project.id}/export?format=mcaddon`} className="btn-primary w-full" download>
                Baixar .mcaddon
              </a>
              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
                Abra o arquivo baixado e o Minecraft importa o behavior pack e o resource pack de uma vez.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
