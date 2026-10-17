import { all, get, makeSlug, newId, run } from './db'
import { DEFAULT_TARGET_VERSION, slugifyNamespace } from './minecraft'
import { getVersions } from './versions'
import { recordActivity } from './activity'
import { emptyProject, starterProject, type ProjectData } from './generator/types'

/**
 * Repositório de projetos, curtidas, comentários e atividade.
 * Toda query é parametrizada; nada de interpolação de string em SQL.
 */

export type ProjectRow = {
  id: string
  user_id: string
  name: string
  slug: string
  summary: string
  kind: string
  category: string
  namespace: string
  target_version: string
  icon: string | null
  data: string
  revision: number
  visibility: string
  downloads: number
  like_count: number
  view_count: number
  featured: number
  created_at: string
  updated_at: string
}

export type ProjectCard = {
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

export type Author = { id: string; username: string; displayName: string; avatarColor: string }

const CARD_FIELDS = `id, user_id, name, slug, summary, kind, category, namespace, target_version,
  icon, revision, visibility, downloads, like_count, view_count, featured, created_at, updated_at`

export function toCard(row: ProjectRow): ProjectCard {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    kind: row.kind,
    category: row.category,
    namespace: row.namespace,
    targetVersion: row.target_version,
    icon: row.icon,
    revision: Number(row.revision) || 1,
    visibility: row.visibility,
    downloads: Number(row.downloads) || 0,
    likeCount: Number(row.like_count) || 0,
    viewCount: Number(row.view_count) || 0,
    featured: Number(row.featured) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function parseData(row: { data: string }): ProjectData {
  try {
    const parsed = JSON.parse(row.data)
    return normalizeData(parsed)
  } catch {
    return emptyProject('Projeto')
  }
}

/** Garante que todo campo esperado existe, mesmo em dados antigos. */
export function normalizeData(input: unknown): ProjectData {
  const raw = (input ?? {}) as Partial<ProjectData>
  const base = emptyProject(raw.meta?.name ?? 'Projeto', raw.meta?.namespace ?? 'forge')
  const meta = { ...base.meta, ...(raw.meta ?? {}) }
  return {
    meta: {
      ...meta,
      namespace: slugifyNamespace(meta.namespace),
      targetVersion: meta.targetVersion || DEFAULT_TARGET_VERSION,
      version: Array.isArray(meta.version) && meta.version.length === 3 ? meta.version : [1, 0, 0],
      packIcon: meta.packIcon ?? null,
    },
    items: Array.isArray(raw.items) ? raw.items : [],
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    entities: Array.isArray(raw.entities) ? raw.entities : [],
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
    world: { ...base.world, ...(raw.world ?? {}) },
  }
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

export async function createProject(input: {
  userId: string
  name: string
  kind?: string
  category?: string
  template?: 'blank' | 'starter' | 'mob' | 'world'
}): Promise<{ id: string; slug: string; data: ProjectData }> {
  const id = newId('prj')
  const slug = makeSlug(input.name)
  const namespace = slugifyNamespace(input.name.replace(/[^a-zA-Z0-9]/g, '') || 'forge')

  // Projetos novos já nascem na versão estável mais recente do datastore.
  let targetVersion = DEFAULT_TARGET_VERSION
  try {
    const versions = await getVersions()
    targetVersion = versions.bedrock.id
  } catch {
    /* mantém o padrão compilado */
  }

  let data: ProjectData
  let kind = 'addon'
  switch (input.template) {
    case 'starter':
      data = starterProject(input.name, namespace)
      data.meta.targetVersion = targetVersion
      break
    case 'mob':
      data = emptyProject(input.name, namespace)
      data.meta.targetVersion = targetVersion
      data.entities.push({
        id: newId('ent'),
        key: 'criatura',
        displayName: 'Minha Criatura',
        texture: null,
        color: '#5ddc7c',
        health: 24,
        damage: 4,
        speed: 0.28,
        followRange: 16,
        knockbackResistance: 0,
        width: 0.9,
        height: 1.8,
        isHostile: false,
        isTameable: true,
        isAquatic: false,
        isFireImmune: false,
        isRideable: false,
        spawnEgg: true,
        eggBase: '#5ddc7c',
        eggOverlay: '#1f8234',
        drops: [],
      })
      break
    case 'world':
      kind = 'world'
      data = starterProject(input.name, namespace)
      data.meta.targetVersion = targetVersion
      break
    default:
      data = emptyProject(input.name, namespace)
      data.meta.targetVersion = targetVersion
  }

  await run(
    `INSERT INTO projects (id, user_id, name, slug, summary, kind, category, namespace, target_version, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.name.slice(0, 60),
      slug,
      data.meta.description.slice(0, 200),
      kind,
      input.category ?? (kind === 'world' ? 'worlds' : 'items'),
      data.meta.namespace,
      data.meta.targetVersion,
      JSON.stringify(data),
    ],
  )

  await saveRevision(id, 1, data, 'criação')
  await recordActivity({
    userId: input.userId,
    type: 'project.create',
    message: `criou o projeto "${input.name}"`,
    projectId: id,
  })

  return { id, slug, data }
}

export async function saveRevision(
  projectId: string,
  revision: number,
  data: ProjectData,
  label = 'auto',
): Promise<void> {
  await run(
    `INSERT INTO revisions (id, project_id, revision, data, label) VALUES (?, ?, ?, ?, ?)`,
    [newId('rev'), projectId, revision, JSON.stringify(data), label],
  )
  // Mantém só as 30 últimas versões por projeto.
  await run(
    `DELETE FROM revisions WHERE project_id = ? AND id NOT IN (
       SELECT id FROM revisions WHERE project_id = ? ORDER BY revision DESC LIMIT 30
     )`,
    [projectId, projectId],
  )
}

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; reason: 'conflict'; revision: number; data: ProjectData; updatedAt: string }
  | { ok: false; reason: 'not_found' }

/**
 * Salva com controle otimista de concorrência.
 * Se outra aba/dispositivo salvou depois, devolve conflito em vez de sobrescrever.
 */
export async function saveProject(
  projectId: string,
  userId: string,
  patch: {
    data?: ProjectData
    name?: string
    summary?: string
    icon?: string | null
    category?: string
    expectedRevision?: number
    label?: string
  },
): Promise<SaveResult> {
  const row = await get<ProjectRow>(`SELECT * FROM projects WHERE id = ?`, [projectId])
  if (!row || row.user_id !== userId) return { ok: false, reason: 'not_found' }

  const currentRevision = Number(row.revision) || 1
  if (patch.expectedRevision !== undefined && patch.expectedRevision !== currentRevision) {
    return {
      ok: false,
      reason: 'conflict',
      revision: currentRevision,
      data: parseData(row),
      updatedAt: row.updated_at,
    }
  }

  const nextRevision = currentRevision + 1
  const data = patch.data ? normalizeData(patch.data) : parseData(row)
  const name = patch.name?.trim().slice(0, 60) || row.name
  const summary = patch.summary !== undefined ? patch.summary.slice(0, 200) : row.summary
  const icon = patch.icon !== undefined ? patch.icon : row.icon
  const category = patch.category || row.category

  await run(
    `UPDATE projects
        SET name = ?, summary = ?, icon = ?, data = ?, revision = ?, category = ?,
            namespace = ?, target_version = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    [
      name,
      summary,
      icon,
      JSON.stringify(data),
      nextRevision,
      category,
      data.meta.namespace,
      data.meta.targetVersion,
      projectId,
      userId,
    ],
  )

  // Guarda um snapshot a cada 5 saves ou quando o usuário pede.
  if (patch.label === 'manual' || nextRevision % 5 === 0) {
    await saveRevision(projectId, nextRevision, data, patch.label ?? 'auto')
  }

  const updated = await get<ProjectRow>(`SELECT * FROM projects WHERE id = ?`, [projectId])
  return {
    ok: true,
    revision: nextRevision,
    updatedAt: updated?.updated_at ?? new Date().toISOString(),
  }
}

export async function deleteProject(projectId: string, userId: string): Promise<boolean> {
  const { changes } = await run(`DELETE FROM projects WHERE id = ? AND user_id = ?`, [
    projectId,
    userId,
  ])
  return changes > 0
}

export async function duplicateProject(projectId: string, userId: string): Promise<string | null> {
  const row = await get<ProjectRow>(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [
    projectId,
    userId,
  ])
  if (!row) return null
  const id = newId('prj')
  await run(
    `INSERT INTO projects (id, user_id, name, slug, summary, kind, category, namespace, target_version, icon, data, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private')`,
    [
      id,
      userId,
      `${row.name} (cópia)`.slice(0, 60),
      makeSlug(`${row.name} copia`),
      row.summary,
      row.kind,
      row.category,
      row.namespace,
      row.target_version,
      row.icon,
      row.data,
    ],
  )
  return id
}

export async function setVisibility(
  projectId: string,
  userId: string,
  visibility: 'private' | 'public',
): Promise<boolean> {
  const { changes } = await run(
    `UPDATE projects SET visibility = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    [visibility, projectId, userId],
  )
  if (changes > 0 && visibility === 'public') {
    const row = await get<ProjectRow>(`SELECT name, slug FROM projects WHERE id = ?`, [projectId])
    await recordActivity({
      userId,
      type: 'project.publish',
      message: `publicou "${row?.name ?? 'um projeto'}" na biblioteca`,
      projectId,
    })
  }
  return changes > 0
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export async function getProjectRow(projectId: string): Promise<ProjectRow | undefined> {
  return get<ProjectRow>(`SELECT * FROM projects WHERE id = ?`, [projectId])
}

export async function getProjectForOwner(
  projectId: string,
  userId: string,
): Promise<ProjectRow | undefined> {
  return get<ProjectRow>(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [projectId, userId])
}

export async function getProjectBySlug(slug: string): Promise<ProjectRow | undefined> {
  return get<ProjectRow>(`SELECT * FROM projects WHERE slug = ?`, [slug])
}

export async function listUserProjects(userId: string): Promise<ProjectCard[]> {
  const rows = await all<ProjectRow>(
    `SELECT ${CARD_FIELDS} FROM projects WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId],
  )
  return rows.map(toCard)
}

export type LibraryQuery = {
  q?: string
  category?: string
  sort?: 'recent' | 'downloads' | 'likes'
  page?: number
  limit?: number
}

export async function listPublicProjects(query: LibraryQuery): Promise<{
  items: (ProjectCard & { author: Author | null })[]
  total: number
}> {
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 12))
  const page = Math.max(1, Number(query.page) || 1)
  const offset = (page - 1) * limit
  const params: (string | number)[] = []

  let where = `WHERE visibility = 'public'`
  if (query.category && query.category !== 'todas') {
    where += ` AND category = ?`
    params.push(query.category)
  }
  if (query.q) {
    where += ` AND (name LIKE ? OR summary LIKE ?)`
    const like = `%${query.q.slice(0, 60)}%`
    params.push(like, like)
  }

  const order =
    query.sort === 'downloads'
      ? `downloads DESC, updated_at DESC`
      : query.sort === 'likes'
        ? `like_count DESC, updated_at DESC`
        : `updated_at DESC`

  const rows = await all<ProjectRow>(
    `SELECT ${CARD_FIELDS} FROM projects ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const totalRow = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM projects ${where}`,
    params,
  )

  const authorIds = [...new Set(rows.map((r) => r.user_id))]
  const authors = new Map<string, Author>()
  for (const id of authorIds) {
    const u = await get<Author>(
      `SELECT id, username, display_name AS displayName, avatar_color AS avatarColor FROM users WHERE id = ?`,
      [id],
    )
    if (u) authors.set(id, u)
  }

  return {
    items: rows.map((r) => ({ ...toCard(r), author: authors.get(r.user_id) ?? null })),
    total: Number(totalRow?.n ?? 0),
  }
}

export async function listRevisions(projectId: string) {
  return all<{ id: string; revision: number; label: string; created_at: string }>(
    `SELECT id, revision, label, created_at FROM revisions
     WHERE project_id = ? ORDER BY revision DESC LIMIT 20`,
    [projectId],
  )
}

export async function getRevision(projectId: string, revisionId: string) {
  return get<{ id: string; revision: number; data: string; created_at: string }>(
    `SELECT id, revision, data, created_at FROM revisions WHERE project_id = ? AND id = ?`,
    [projectId, revisionId],
  )
}

/* ------------------------------------------------------------------ */
/* Social                                                              */
/* ------------------------------------------------------------------ */

export async function toggleLike(
  projectId: string,
  userId: string,
): Promise<{ liked: boolean; count: number }> {
  const existing = await get<{ project_id: string }>(
    `SELECT project_id FROM likes WHERE project_id = ? AND user_id = ?`,
    [projectId, userId],
  )

  if (existing) {
    await run(`DELETE FROM likes WHERE project_id = ? AND user_id = ?`, [projectId, userId])
    await run(`UPDATE projects SET like_count = MAX(0, like_count - 1) WHERE id = ?`, [projectId])
  } else {
    await run(`INSERT INTO likes (project_id, user_id) VALUES (?, ?)`, [projectId, userId])
    await run(`UPDATE projects SET like_count = like_count + 1 WHERE id = ?`, [projectId])
  }

  const row = await get<{ like_count: number }>(
    `SELECT like_count FROM projects WHERE id = ?`,
    [projectId],
  )
  return { liked: !existing, count: Number(row?.like_count ?? 0) }
}

export async function hasLiked(projectId: string, userId: string): Promise<boolean> {
  const row = await get(`SELECT 1 AS ok FROM likes WHERE project_id = ? AND user_id = ?`, [
    projectId,
    userId,
  ])
  return Boolean(row)
}

export async function listComments(projectId: string, limit = 30) {
  return all<{ id: string; body: string; created_at: string; username: string; display_name: string; avatar_color: string }>(
    `SELECT c.id, c.body, c.created_at, u.username, u.display_name, u.avatar_color
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.project_id = ? ORDER BY c.created_at DESC LIMIT ?`,
    [projectId, limit],
  )
}

export async function addComment(projectId: string, userId: string, body: string): Promise<void> {
  await run(`INSERT INTO comments (id, project_id, user_id, body) VALUES (?, ?, ?, ?)`, [
    newId('cmt'),
    projectId,
    userId,
    body.trim().slice(0, 500),
  ])
}

export async function recordDownload(
  projectId: string | null,
  userId: string | null,
  format: string,
): Promise<void> {
  await run(`INSERT INTO downloads (id, project_id, user_id, format) VALUES (?, ?, ?, ?)`, [
    newId('dl'),
    projectId,
    userId,
    format,
  ])
  if (projectId) {
    await run(`UPDATE projects SET downloads = downloads + 1 WHERE id = ?`, [projectId])
  }
}

export async function incrementViews(projectId: string): Promise<void> {
  await run(`UPDATE projects SET view_count = view_count + 1 WHERE id = ?`, [projectId])
}

export async function listActivity(limit = 25) {
  return all<{ id: string; type: string; message: string; created_at: string; username: string | null; project_id: string | null }>(
    `SELECT a.id, a.type, a.message, a.created_at, a.project_id, u.username
       FROM activity a LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?`,
    [limit],
  )
}

export async function listMail(limit = 30) {
  return all<{ id: string; to_email: string; subject: string; body: string; created_at: string }>(
    `SELECT id, to_email, subject, body, created_at FROM mail_outbox
      ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [limit],
  )
}

export async function stats() {
  const projects = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM projects`)
  const users = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`)
  const downloads = await get<{ n: number }>(`SELECT COALESCE(SUM(downloads), 0) AS n FROM projects`)
  const published = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM projects WHERE visibility = 'public'`,
  )
  return {
    projects: Number(projects?.n ?? 0),
    users: Number(users?.n ?? 0),
    downloads: Number(downloads?.n ?? 0),
    published: Number(published?.n ?? 0),
  }
}
