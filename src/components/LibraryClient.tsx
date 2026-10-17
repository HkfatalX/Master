'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { api, formatRelative } from '@/lib/client'
import { CATEGORIES } from '@/lib/minecraft'

export type LibraryItem = {
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
  downloads: number
  likeCount: number
  viewCount: number
  updatedAt: string
  author: { id: string; username: string; displayName: string; avatarColor: string } | null
}

const SORTS = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'downloads', label: 'Mais baixados' },
  { id: 'likes', label: 'Mais curtidos' },
]

const PAGE_SIZE = 12

export function LibraryClient() {
  const router = useRouter()
  const params = useSearchParams()

  const [items, setItems] = useState<LibraryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(params.get('q') ?? '')
  const category = params.get('category') ?? 'todas'
  const sort = params.get('sort') ?? 'recent'
  const page = Number(params.get('page') ?? 1)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 350)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const search = new URLSearchParams({
        q: debounced,
        category,
        sort,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      const result = await api<{ items: LibraryItem[]; total: number }>(`/api/library?${search}`)
      setItems(result.items)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a biblioteca.')
    } finally {
      setLoading(false)
    }
  }, [debounced, category, sort, page])

  useEffect(() => {
    void load()
  }, [load])

  function updateParams(next: Record<string, string>) {
    const search = new URLSearchParams({
      q: debounced,
      category,
      sort,
      page: '1',
      ...next,
    })
    for (const [key, value] of Object.entries(search)) {
      if (!value || value === 'todas' || value === 'recent' || value === '1') search.delete(key)
    }
    const qs = search.toString()
    router.replace(qs ? `/biblioteca?${qs}` : '/biblioteca', { scroll: false })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Biblioteca</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Addons publicados pela comunidade. Baixe, curta e estude como foram feitos.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <input
            className="input pl-10"
            placeholder="Buscar por nome ou descrição…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">🔎</span>
        </div>
        <select
          className="input lg:w-48"
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
        >
          {SORTS.map((option) => (
            <option key={option.id} value={option.id} className="bg-ink-900">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'todas', label: 'Tudo', emoji: '✨' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }))].map(
          (option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateParams({ category: option.id })}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                category === option.id
                  ? 'border-grass-500/50 bg-grass-500/15 text-grass-300'
                  : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
              }`}
            >
              <span className="mr-1.5">{option.emoji}</span>
              {option.label}
            </button>
          ),
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card h-52 animate-pulse bg-white/[0.03]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-8 grid place-items-center p-14 text-center">
          <span className="text-5xl">🔍</span>
          <p className="mt-4 text-lg font-bold text-white">Nada encontrado</p>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            {debounced
              ? `Nenhum addon público corresponde a "${debounced}".`
              : 'Ainda não há addons publicados nesta categoria. Que tal publicar o seu?'}
          </p>
          <Link href="/painel" className="btn-primary mt-6">
            Ir para meus projetos
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                ← Anterior
              </button>
              <span className="px-3 text-sm text-slate-400">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const category = CATEGORIES.find((c) => c.id === item.category)
  return (
    <Link href={`/biblioteca/${item.slug}`} className="card card-hover group flex flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink-950/60 text-xl">
          {item.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.icon} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{category?.emoji ?? '📦'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white group-hover:text-grass-400">{item.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            por {item.author?.displayName ?? 'anônimo'} · {formatRelative(item.updatedAt)}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.summary || 'Sem descrição.'}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-3 text-xs text-slate-500">
        <span>⬇️ {item.downloads}</span>
        <span>❤️ {item.likeCount}</span>
        <span>👁️ {item.viewCount}</span>
        <span className="ml-auto font-mono text-grass-400">{item.targetVersion}</span>
      </div>
    </Link>
  )
}
