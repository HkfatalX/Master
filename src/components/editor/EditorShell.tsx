'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api, formatBytes } from '@/lib/client'
import { CATEGORIES, DEFAULT_TARGET_VERSION, TARGET_VERSIONS } from '@/lib/minecraft'
import {
  emptyBlock,
  emptyEntity,
  emptyItem,
  emptyRecipe,
  ns,
  type ProjectData,
  type ProjectMeta,
} from '@/lib/generator/types'
import type { Issue, ValidationResult } from '@/lib/generator/validate'
import { BlockForm, EntityForm, ItemForm, RecipeForm, WorldForm } from './Forms'
import { ImageField } from './Fields'

type Props = {
  projectId: string
  initial: {
    id: string
    name: string
    slug: string
    kind: string
    category: string
    visibility: string
    revision: number
    data: ProjectData
  }
  initialValidation: ValidationResult
  emailVerified: boolean
}

type Tab = 'items' | 'blocks' | 'entities' | 'recipes' | 'world' | 'files' | 'meta'
type SaveState = 'saved' | 'dirty' | 'saving' | 'conflict' | 'error'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'items', label: 'Itens', icon: '🍎' },
  { id: 'blocks', label: 'Blocos', icon: '🧱' },
  { id: 'entities', label: 'Mobs', icon: '🐉' },
  { id: 'recipes', label: 'Receitas', icon: '⚗️' },
  { id: 'world', label: 'Mundo', icon: '🌍' },
  { id: 'files', label: 'Arquivos', icon: '📦' },
  { id: 'meta', label: 'Ajustes', icon: '⚙️' },
]

export function EditorShell({ projectId, initial, initialValidation, emailVerified }: Props) {
  const [data, setData] = useState<ProjectData>(initial.data)
  const [name, setName] = useState(initial.name)
  const [revision, setRevision] = useState(initial.revision)
  const [state, setState] = useState<SaveState>('saved')
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult>(initialValidation)
  const [tab, setTab] = useState<Tab>('items')
  const [selected, setSelected] = useState<Record<string, string | null>>({})
  const [visibility, setVisibility] = useState(initial.visibility)
  const [category, setCategory] = useState(initial.category)
  const [files, setFiles] = useState<
    { path: string; size: number; type: 'json' | 'image' | 'text'; content: string | null }[] | null
  >(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [externalChange, setExternalChange] = useState(false)

  const tabId = useRef<string>('')
  if (!tabId.current && typeof window !== 'undefined') {
    tabId.current = Math.random().toString(36).slice(2, 12)
  }

  const namespace = ns(data.meta)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)

  /* ---------------------------------------------------------------- */
  /* Autosave                                                          */
  /* ---------------------------------------------------------------- */

  const save = useCallback(
    async (options: { label?: 'auto' | 'manual' } = {}) => {
      if (savingRef.current) return
      savingRef.current = true
      setState('saving')

      try {
        const result = await api<{ revision: number; updatedAt: string; warnings?: Issue[] }>(
          `/api/projects/${projectId}`,
          {
            method: 'PATCH',
            body: {
              data,
              name,
              revision,
              tab: tabId.current,
              label: options.label ?? 'auto',
            },
          },
        )
        setRevision(result.revision)
        setState('saved')
        setError(null)
        dirtyRef.current = false
        // Revalida localmente para refletir avisos do servidor.
        setValidation((prev) => ({ ...prev, warnings: result.warnings ?? prev.warnings }))
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 409) {
          setState('conflict')
          setError('Este projeto foi alterado em outra aba ou dispositivo.')
          return
        }
        setState('error')
        setError(err instanceof Error ? err.message : 'Falha ao salvar.')
      } finally {
        savingRef.current = false
      }
    },
    [data, name, projectId, revision],
  )

  // Autosave com debounce de 1,2 s depois da última alteração.
  useEffect(() => {
    if (!dirtyRef.current) return
    if (!validation.ok) {
      setState('dirty')
      return
    }
    const timer = setTimeout(() => {
      void save()
    }, 1200)
    return () => clearTimeout(timer)
  }, [data, name, validation.ok, save])

  /* ---------------------------------------------------------------- */
  /* Tempo real (SSE)                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return
    const source = new EventSource('/api/stream')

    source.addEventListener('ready', () => setLive(true))

    const onProjectSave = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { projectId?: string; tab?: string }
        if (payload.tab === tabId.current) return // foi a própria aba
        if (payload.projectId !== projectId) return
        if (dirtyRef.current) return // há edições locais não salvas
        setExternalChange(true)
      } catch {
        /* ignora payload inválido */
      }
    }

    source.addEventListener('project.save', onProjectSave as EventListener)
    source.onerror = () => setLive(false)

    return () => source.close()
  }, [projectId])

  async function reloadFromServer() {
    const result = await api<{ project: { data: ProjectData; revision: number; name: string } }>(
      `/api/projects/${projectId}`,
    )
    setData(result.project.data)
    setRevision(result.project.revision)
    setName(result.project.name)
    setState('saved')
    setExternalChange(false)
    dirtyRef.current = false
  }

  /* ---------------------------------------------------------------- */
  /* Mutadores                                                         */
  /* ---------------------------------------------------------------- */

  const patch = useCallback((updater: (current: ProjectData) => ProjectData) => {
    setData((current) => {
      const next = updater(current)
      dirtyRef.current = true
      setState('dirty')
      // Validação otimista local é feita no servidor; aqui apenas marcamos.
      return next
    })
  }, [])

  const patchMeta = useCallback((value: Partial<ProjectMeta>) => {
    setData((current) => {
      dirtyRef.current = true
      setState('dirty')
      return { ...current, meta: { ...current.meta, ...value } }
    })
  }, [])

  async function reloadValidation() {
    try {
      const result = await api<{ validation: ValidationResult }>(
        `/api/projects/${projectId}/preview`,
      )
      setValidation(result.validation)
    } catch {
      /* mantém a validação anterior */
    }
  }

  useEffect(() => {
    if (state === 'saved') void reloadValidation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])

  /* ---------------------------------------------------------------- */
  /* Conteúdo por aba                                                  */
  /* ---------------------------------------------------------------- */

  const contentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    for (const item of data.items) {
      options.push({ value: `${namespace}:${item.key}`, label: `${item.displayName} (${namespace}:${item.key})` })
    }
    for (const block of data.blocks) {
      options.push({ value: `${namespace}:${block.key}`, label: `${block.displayName} (${namespace}:${block.key})` })
    }
    return options
  }, [data.items, data.blocks, namespace])

  async function loadFiles() {
    if (files) return
    try {
      const result = await api<{
        tree: { path: string; size: number; type: 'json' | 'image' | 'text'; content: string | null }[]
      }>(`/api/projects/${projectId}/preview`)
      setFiles(result.tree)
    } catch {
      setFiles([])
    }
  }

  useEffect(() => {
    if (tab === 'files') void loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function publish(next: 'public' | 'private') {
    try {
      await api(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        body: { visibility: next },
      })
      setVisibility(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar.')
    }
  }

  function exportPack(format: string) {
    window.location.href = `/api/projects/${projectId}/export?format=${format}`
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const list = tab === 'items' ? data.items : tab === 'blocks' ? data.blocks : tab === 'entities' ? data.entities : data.recipes
  const selectedId = selected[tab]
  const current = list.find((entry) => entry.id === selectedId) ?? null

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Barra superior */}
      <div className="sticky top-16 z-30 border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/painel" className="btn-ghost px-2.5 py-2 text-sm" title="Voltar para meus projetos">
            ←
          </Link>

          <input
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold text-white hover:border-white/10 focus:border-grass-500/50 focus:outline-none"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value)
              dirtyRef.current = true
              setState('dirty')
            }}
            aria-label="Nome do projeto"
          />

          <SaveBadge state={state} live={live} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => void save({ label: 'manual' })}
              disabled={state === 'saving'}
            >
              Salvar agora
            </button>

            <div className="group relative">
              <button type="button" className="btn-primary px-3 py-2 text-xs">
                Baixar .mcaddon ▾
              </button>
              <div className="invisible absolute right-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1.5 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <ExportOption label="Addon completo (.mcaddon)" hint="Behavior + resource pack" onClick={() => exportPack('mcaddon')} />
                <ExportOption label="Pasta do projeto (.zip)" hint="Todos os arquivos para editar" onClick={() => exportPack('zip')} />
                <ExportOption label="Só behavior pack" hint="Lógica: itens, blocos, mobs, receitas" onClick={() => exportPack('bp')} />
                <ExportOption label="Só resource pack" hint="Texturas, modelos e sons" onClick={() => exportPack('rp')} />
              </div>
            </div>

            {visibility === 'public' ? (
              <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => void publish('private')}>
                🔓 Público
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => void publish('public')}
                title={emailVerified ? 'Publicar na biblioteca' : 'Confirme seu e-mail para publicar'}
              >
                🔒 Publicar
              </button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <nav className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
            {TABS.map((entry) => {
              const count =
                entry.id === 'items'
                  ? data.items.length
                  : entry.id === 'blocks'
                    ? data.blocks.length
                    : entry.id === 'entities'
                      ? data.entities.length
                      : entry.id === 'recipes'
                        ? data.recipes.length
                        : null
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    tab === entry.id
                      ? 'border-grass-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{entry.icon}</span>
                  {entry.label}
                  {count !== null && count > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Avisos */}
      {(error || externalChange) && (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
          {error && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="flex-1">⚠ {error}</span>
              {state === 'conflict' && (
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void reloadFromServer()}>
                  Recarregar versão do servidor
                </button>
              )}
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setError(null)}>
                Fechar
              </button>
            </div>
          )}
          {externalChange && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-400">
              <span className="flex-1">Outra aba salvou alterações neste projeto.</span>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void reloadFromServer()}>
                Atualizar
              </button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setExternalChange(false)}>
                Ignorar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
        {/* Lista lateral */}
        {tab !== 'files' && tab !== 'meta' && tab !== 'world' && (
          <aside className="w-full shrink-0 lg:w-72">
            <div className="card sticky top-[9.5rem] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {TABS.find((t) => t.id === tab)?.label}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-grass-500/15 px-2 py-1 text-xs font-bold text-grass-300 hover:bg-grass-500/25"
                  onClick={() => {
                    const created =
                      tab === 'items'
                        ? emptyItem(tab === 'items' ? 'novo_item' : 'item', namespace)
                        : tab === 'blocks'
                          ? emptyBlock('novo_bloco', namespace)
                          : tab === 'entities'
                            ? emptyEntity('nova_criatura', namespace)
                            : emptyRecipe('nova_receita', namespace)
                    patch((current) => {
                      if (tab === 'items') return { ...current, items: [...current.items, created as never] }
                      if (tab === 'blocks') return { ...current, blocks: [...current.blocks, created as never] }
                      if (tab === 'entities') return { ...current, entities: [...current.entities, created as never] }
                      return { ...current, recipes: [...current.recipes, created as never] }
                    })
                    setSelected((prev) => ({ ...prev, [tab]: (created as { id: string }).id }))
                  }}
                >
                  + Novo
                </button>
              </div>

              <div className="max-h-[calc(100vh-20rem)] overflow-y-auto p-1.5">
                {list.length === 0 && (
                  <p className="px-2.5 py-6 text-center text-xs leading-relaxed text-slate-500">
                    Nada por aqui ainda.
                    <br />
                    Clique em “+ Novo” para começar.
                  </p>
                )}
                {list.map((entry) => {
                  const entryName = (entry as { displayName?: string; key?: string }).displayName || (entry as { key: string }).key
                  const isActive = entry.id === selectedId
                  return (
                    <div
                      key={entry.id}
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        isActive ? 'bg-grass-500/15 text-white' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => setSelected((prev) => ({ ...prev, [tab]: entry.id }))}
                      >
                        {entryName}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1.5 text-xs text-slate-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        title="Excluir"
                        onClick={() => {
                          patch((current) => {
                            if (tab === 'items') return { ...current, items: current.items.filter((i) => i.id !== entry.id) }
                            if (tab === 'blocks') return { ...current, blocks: current.blocks.filter((i) => i.id !== entry.id) }
                            if (tab === 'entities') return { ...current, entities: current.entities.filter((i) => i.id !== entry.id) }
                            return { ...current, recipes: current.recipes.filter((i) => i.id !== entry.id) }
                          })
                          setSelected((prev) => ({ ...prev, [tab]: null }))
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Conteúdo */}
        <section className="min-w-0 flex-1">
          {tab === 'items' && current && (
            <ItemForm
              item={current as never}
              namespace={namespace}
              onChange={(value) =>
                patch((c) => ({ ...c, items: c.items.map((i) => (i.id === current.id ? { ...i, ...value } : i)) }))
              }
            />
          )}
          {tab === 'blocks' && current && (
            <BlockForm
              block={current as never}
              namespace={namespace}
              onChange={(value) =>
                patch((c) => ({ ...c, blocks: c.blocks.map((i) => (i.id === current.id ? { ...i, ...value } : i)) }))
              }
            />
          )}
          {tab === 'entities' && current && (
            <EntityForm
              entity={current as never}
              namespace={namespace}
              contentOptions={contentOptions}
              onChange={(value) =>
                patch((c) => ({ ...c, entities: c.entities.map((i) => (i.id === current.id ? { ...i, ...value } : i)) }))
              }
            />
          )}
          {tab === 'recipes' && current && (
            <RecipeForm
              recipe={current as never}
              namespace={namespace}
              contentOptions={contentOptions}
              onChange={(value) =>
                patch((c) => ({ ...c, recipes: c.recipes.map((i) => (i.id === current.id ? { ...i, ...value } : i)) }))
              }
            />
          )}

          {tab !== 'files' && tab !== 'meta' && tab !== 'world' && !current && (
            <div className="card grid place-items-center p-12 text-center">
              <span className="text-4xl">{TABS.find((t) => t.id === tab)?.icon}</span>
              <p className="mt-3 font-semibold text-white">Selecione um item à esquerda</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Ou crie um novo para começar a montar seu {TABS.find((t) => t.id === tab)?.label.toLowerCase()}.
              </p>
            </div>
          )}

          {tab === 'world' && (
            <WorldForm world={data.world} onChange={(value) => patch((c) => ({ ...c, world: { ...c.world, ...value } }))} />
          )}

          {tab === 'meta' && (
            <div className="max-w-2xl space-y-4">
              <div className="card space-y-4 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-grass-400">Projeto</h3>
                <label className="block">
                  <span className="label">Nome</span>
                  <input className="input" value={data.meta.name} maxLength={48} onChange={(e) => patchMeta({ name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Descrição</span>
                  <textarea
                    className="input min-h-[80px]"
                    value={data.meta.description}
                    maxLength={200}
                    onChange={(e) => patchMeta({ description: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="label">Autor</span>
                  <input className="input" value={data.meta.author} maxLength={40} onChange={(e) => patchMeta({ author: e.target.value })} />
                </label>
              </div>

              <div className="card space-y-4 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-grass-400">Namespace e versão</h3>
                <label className="block">
                  <span className="label">Namespace</span>
                  <input
                    className="input font-mono"
                    value={data.meta.namespace}
                    maxLength={20}
                    onChange={(e) => patchMeta({ namespace: e.target.value })}
                  />
                  <span className="mt-1.5 block text-[11px] text-slate-500">
                    Prefixo de todos os identificadores: <code className="kbd">{namespace}:nome</code>. Não use{' '}
                    <code className="kbd">minecraft</code>.
                  </span>
                </label>
                <label className="block">
                  <span className="label">Versão alvo do Minecraft</span>
                  <select
                    className="input"
                    value={data.meta.targetVersion}
                    onChange={(e) => patchMeta({ targetVersion: e.target.value })}
                  >
                    {TARGET_VERSIONS.map((version) => (
                      <option key={version.id} value={version.id} className="bg-ink-900">
                        {version.label}
                        {version.recommended ? ' — recomendado' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-[11px] text-slate-500">
                    Define o <code className="kbd">min_engine_version</code> do manifest. Padrão: {DEFAULT_TARGET_VERSION}.
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {([0, 1, 2] as const).map((index) => (
                    <label key={index} className="block">
                      <span className="label">Versão {['maior', 'menor', 'correção'][index]}</span>
                      <input
                        type="number"
                        className="input"
                        min={0}
                        max={999}
                        value={data.meta.version[index]}
                        onChange={(e) => {
                          const next = [...data.meta.version] as [number, number, number]
                          next[index] = Math.max(0, Math.min(999, Number.parseInt(e.target.value, 10) || 0))
                          patchMeta({ version: next })
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="card space-y-4 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-grass-400">Categoria e ícone</h3>
                <label className="block">
                  <span className="label">Categoria na biblioteca</span>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => {
                      const next = e.target.value
                      setCategory(next)
                      void api(`/api/projects/${projectId}`, {
                        method: 'PATCH',
                        body: { data, name, revision, tab: tabId.current, label: 'auto', category: next },
                      })
                    }}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id} className="bg-ink-900">
                        {category.emoji} {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <ImageField
                  value={data.meta.packIcon}
                  onChange={(packIcon) => patchMeta({ packIcon })}
                  label="Ícone do pack (PNG 64x64)"
                />
              </div>

              <div className="card p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-red-400">Zona de perigo</h3>
                <p className="mb-4 text-sm text-slate-400">
                  Excluir o projeto remove todas as versões salvas. Essa ação não pode ser desfeita.
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    if (!window.confirm(`Excluir "${name}" para sempre?`)) return
                    await api(`/api/projects/${projectId}`, { method: 'DELETE' })
                    window.location.href = '/painel'
                  }}
                >
                  Excluir projeto
                </button>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="card max-h-[70vh] overflow-y-auto p-2">
                {!files ? (
                  <p className="p-4 text-sm text-slate-500">Carregando…</p>
                ) : files.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Nenhum arquivo gerado ainda.</p>
                ) : (
                  files.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setOpenFile(file.path)}
                      className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                        openFile === file.path ? 'bg-grass-500/15 text-grass-300' : 'text-slate-400 hover:bg-white/5'
                      }`}
                      title={file.path}
                    >
                      {file.type === 'image' ? '🖼' : file.type === 'json' ? '{ }' : '📄'} {file.path}
                      <span className="ml-1 text-slate-600">{formatBytes(file.size)}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="card overflow-hidden">
                {!openFile ? (
                  <div className="grid place-items-center p-12 text-center">
                    <span className="text-4xl">📦</span>
                    <p className="mt-3 font-semibold text-white">
                      {files ? `${files.length} arquivos gerados` : 'Gerando…'}
                    </p>
                    <p className="mt-1 max-w-md text-sm text-slate-400">
                      Esta é exatamente a estrutura que vai dentro do .mcaddon. Clique em um arquivo para
                      inspecionar o conteúdo.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                      <span className="truncate font-mono text-xs text-slate-400">{openFile}</span>
                      <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setOpenFile(null)}>
                        Fechar
                      </button>
                    </div>
                    <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-slate-300">
                      {files?.find((f) => f.path === openFile)?.content ?? ''}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Painel de validação */}
        <aside className="w-full shrink-0 lg:w-80">
          <div className="card sticky top-[9.5rem] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Validação</span>
              <span
                className={`chip ${
                  validation.errors.length
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border-grass-500/30 bg-grass-500/10 text-grass-300'
                }`}
              >
                {validation.errors.length ? `${validation.errors.length} erro(s)` : 'OK'}
              </span>
            </div>

            <div className="max-h-[calc(100vh-20rem)] space-y-2 overflow-y-auto p-3">
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-slate-500">
                  Nenhum problema encontrado. Seu pack está pronto para exportar.
                </p>
              )}

              {validation.errors.map((issue) => (
                <IssueCard key={`e-${issue.code}-${issue.at ?? ''}`} issue={issue} />
              ))}
              {validation.warnings.map((issue) => (
                <IssueCard key={`w-${issue.code}-${issue.at ?? ''}`} issue={issue} />
              ))}
            </div>

            <div className="border-t border-white/[0.07] px-3.5 py-3">
              <button type="button" className="btn-secondary w-full py-2 text-xs" onClick={() => void reloadValidation()}>
                Validar agora
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Erros bloqueiam o export. Avisos não impedem, mas vale olhar.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SaveBadge({ state, live }: { state: SaveState; live: boolean }) {
  const config = {
    saved: { text: 'Salvo', dot: 'bg-grass-400', extra: 'text-grass-300' },
    dirty: { text: 'Alterações pendentes', dot: 'bg-ember-500', extra: 'text-ember-400' },
    saving: { text: 'Salvando…', dot: 'bg-blue-400 animate-pulse', extra: 'text-blue-300' },
    conflict: { text: 'Conflito', dot: 'bg-red-500', extra: 'text-red-300' },
    error: { text: 'Erro ao salvar', dot: 'bg-red-500', extra: 'text-red-300' },
  }[state]

  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={config.extra}>{config.text}</span>
      {live && (
        <span className="hidden items-center gap-1 text-slate-500 sm:flex" title="Conexão em tempo real ativa">
          · tempo real
        </span>
      )}
    </span>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  const isError = issue.level === 'error'
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 text-xs ${
        isError ? 'border-red-500/25 bg-red-500/[0.07]' : 'border-ember-500/25 bg-ember-500/[0.07]'
      }`}
    >
      <p className={isError ? 'text-red-300' : 'text-ember-400'}>{issue.message}</p>
      {issue.at && <p className="mt-1 font-mono text-[10px] text-slate-500">{issue.at}</p>}
    </div>
  )
}

function ExportOption({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
    >
      <span className="block text-sm font-medium text-slate-200">{label}</span>
      <span className="block text-[11px] text-slate-500">{hint}</span>
    </button>
  )
}
