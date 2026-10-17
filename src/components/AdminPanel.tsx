'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { api, formatDate } from '@/lib/client'
import type { VersionInfo, Versions } from '@/lib/versions'

type Editable = { [K in 'bedrock' | 'java' | 'preview']: VersionInfo }

export function AdminPanel({
  initial,
  stats,
}: {
  initial: Versions
  stats: { projects: number; users: number; downloads: number; published: number }
}) {
  const router = useRouter()
  const [form, setForm] = useState<Editable>({
    bedrock: initial.bedrock,
    java: initial.java,
    preview: initial.preview,
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function patch(key: keyof Editable, field: keyof VersionInfo, value: string) {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api<{ versions: Versions }>('/api/admin/versions', {
        method: 'POST',
        body: form,
      })
      setMessage(`Versões atualizadas: Bedrock ${result.versions.bedrock.id}.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (!window.confirm('Voltar para as versões padrão do build?')) return
    setBusy(true)
    try {
      const result = await api<{ versions: Versions }>('/api/admin/versions', { method: 'DELETE' })
      setForm({ bedrock: result.versions.bedrock, java: result.versions.java, preview: result.versions.preview })
      setMessage('Versões restauradas para o padrão.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível restaurar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-white">Administração</h1>
      <p className="mt-1.5 text-sm text-slate-400">
        Mantenha o CraftForge sempre na versão mais recente do Minecraft, sem precisar de deploy.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Projetos', value: stats.projects },
          { label: 'Usuários', value: stats.users },
          { label: 'Publicados', value: stats.published },
          { label: 'Downloads', value: stats.downloads },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</span>
            <p className="mt-1 text-2xl font-black text-white">{item.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="mt-6 space-y-4">
        {message && (
          <div className="rounded-xl border border-grass-500/30 bg-grass-500/10 px-4 py-3 text-sm text-grass-300">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {(['bedrock', 'java', 'preview'] as const).map((key) => {
          const meta = {
            bedrock: { title: 'Minecraft Bedrock (estável)', accent: 'text-grass-400', hint: 'Alvo padrão de todos os projetos novos.' },
            java: { title: 'Minecraft Java (estável)', accent: 'text-ember-400', hint: 'Referência de catálogo.' },
            preview: { title: 'Bedrock Preview / Beta', accent: 'text-slate-300', hint: 'Instável — nunca use em addons publicados.' },
          }[key]

          return (
            <div key={key} className="card space-y-3.5 p-5">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${meta.accent}`}>{meta.title}</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{meta.hint}</p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="label">ID da versão</span>
                  <input
                    className="input font-mono"
                    value={form[key].id}
                    onChange={(e) => patch(key, 'id', e.target.value)}
                    placeholder="1.26.52"
                  />
                </label>
                <label className="block">
                  <span className="label">Release</span>
                  <input
                    className="input font-mono"
                    value={form[key].release}
                    onChange={(e) => patch(key, 'release', e.target.value)}
                    placeholder="26.52"
                  />
                </label>
                <label className="block">
                  <span className="label">Rótulo</span>
                  <input
                    className="input"
                    value={form[key].label}
                    onChange={(e) => patch(key, 'label', e.target.value)}
                    maxLength={60}
                  />
                </label>
                <label className="block">
                  <span className="label">Data de lançamento</span>
                  <input
                    type="date"
                    className="input"
                    value={form[key].releasedAt}
                    onChange={(e) => patch(key, 'releasedAt', e.target.value)}
                  />
                </label>
              </div>

              <label className="block">
                <span className="label">Notas</span>
                <textarea
                  className="input min-h-[70px]"
                  value={form[key].notes}
                  maxLength={400}
                  onChange={(e) => patch(key, 'notes', e.target.value)}
                />
              </label>
            </div>
          )
        })}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar versões'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void reset()} disabled={busy}>
            Restaurar padrão
          </button>
          <Link href="/painel" className="btn-ghost">
            Voltar aos projetos
          </Link>
        </div>

        {initial.updatedAt && (
          <p className="text-[11px] text-slate-500">
            Última atualização: {formatDate(initial.updatedAt)}
          </p>
        )}
      </form>
    </div>
  )
}
