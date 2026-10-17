import { MINECRAFT_VERSIONS } from './minecraft'
import { get, run } from './db'

/**
 * Versões do Minecraft com override em runtime.
 *
 * As constantes em `minecraft.ts` são o padrão compilado. Se um administrador
 * atualizar as versões pelo painel, o valor fica no datastore e passa a valer
 * imediatamente — sem precisar de novo deploy.
 */

export type VersionInfo = {
  id: string
  release: string
  label: string
  releasedAt: string
  kind: 'stable' | 'preview'
  notes: string
}

export type Versions = {
  bedrock: VersionInfo
  java: VersionInfo
  preview: VersionInfo
  updatedAt: string | null
  overridden: boolean
}

function cloneDefault(): Versions {
  return {
    bedrock: { ...MINECRAFT_VERSIONS.bedrock },
    java: { ...MINECRAFT_VERSIONS.java },
    preview: { ...MINECRAFT_VERSIONS.preview },
    updatedAt: null,
    overridden: false,
  }
}

const ID_RE = /^\d+\.\d+(\.\d+)*$/

function sanitize(input: unknown, fallback: VersionInfo): VersionInfo {
  const raw = (input ?? {}) as Partial<VersionInfo>
  const id = typeof raw.id === 'string' && ID_RE.test(raw.id.trim()) ? raw.id.trim() : fallback.id
  const release = typeof raw.release === 'string' && raw.release.trim() ? raw.release.trim() : fallback.release
  return {
    id,
    release,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim().slice(0, 60) : fallback.label,
    releasedAt:
      typeof raw.releasedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.releasedAt)
        ? raw.releasedAt
        : fallback.releasedAt,
    kind: raw.kind === 'preview' ? 'preview' : fallback.kind,
    notes: typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 400) : fallback.notes,
  }
}

export async function getVersions(): Promise<Versions> {
  try {
    const row = await get<{ value: string; created_at?: string | null }>(
      `SELECT value, created_at FROM meta WHERE key = 'versions'`,
    )
    if (!row?.value) return cloneDefault()

    const parsed = JSON.parse(row.value) as Partial<Versions>
    const base = cloneDefault()
    return {
      bedrock: sanitize(parsed.bedrock, base.bedrock),
      java: sanitize(parsed.java, base.java),
      preview: sanitize(parsed.preview, base.preview),
      updatedAt: row.created_at ?? null,
      overridden: true,
    }
  } catch (err) {
    console.error('[craftforge] falha ao ler versões do datastore:', err)
    return cloneDefault()
  }
}

export async function setVersions(patch: Partial<Versions>): Promise<Versions> {
  const current = await getVersions()
  const next: Versions = {
    bedrock: patch.bedrock ? sanitize(patch.bedrock, current.bedrock) : current.bedrock,
    java: patch.java ? sanitize(patch.java, current.java) : current.java,
    preview: patch.preview ? sanitize(patch.preview, current.preview) : current.preview,
    updatedAt: new Date().toISOString(),
    overridden: true,
  }
  await run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('versions', ?)`, [
    JSON.stringify({ bedrock: next.bedrock, java: next.java, preview: next.preview }),
  ])
  return next
}

export async function resetVersions(): Promise<Versions> {
  await run(`DELETE FROM meta WHERE key = 'versions'`)
  return cloneDefault()
}

/** Versão alvo padrão (sempre a estável de Bedrock). */
export async function getDefaultTarget(): Promise<string> {
  const versions = await getVersions()
  return versions.bedrock.id
}
