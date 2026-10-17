import fs from 'node:fs'
import path from 'node:path'
import nodeCrypto from 'node:crypto'
import initSqlJs, { type Database as SqlJsDatabase, type SqlValue } from 'sql.js'

/**
 * Datastore do CraftForge — SQLite real, sem módulo nativo.
 *
 * Usamos `sql.js` (SQLite compilado em WebAssembly) em vez de `better-sqlite3`:
 *  - zero build nativo → funciona em qualquer ambiente (Vercel, Docker, preview);
 *  - mesma sintaxe SQL, índices, transações e constraints;
 *  - persistência em arquivo com escrita atômica (tmp + rename) e flush
 *    debounced, então nada se perde mesmo com requisições simultâneas.
 *
 * Todas as queries usam parâmetros bind (`?`) — nenhuma string SQL é
 * concatenada com dados do usuário, o que elimina SQL injection por construção.
 */

const DB_PATH =
  process.env.CRAFTFORGE_DB ?? path.join(process.cwd(), 'data', 'craftforge.db')

const FLUSH_DEBOUNCE_MS = Number(process.env.CRAFTFORGE_FLUSH_MS ?? 250)

type Row = Record<string, SqlValue>

/**
 * O webpack gera um bundle por rota, e cada um teria sua própria cópia deste
 * módulo — ou seja, vários bancos em memória brigando pelo mesmo arquivo.
 * Guardamos a instância (e o estado de flush) em globalThis para que exista
 * exatamente UM banco por processo.
 */
type DbGlobalState = {
  instance: SqlJsDatabase | null
  pending: Promise<SqlJsDatabase> | null
  flushTimer: NodeJS.Timeout | null
  dirty: boolean
}

const globalState: DbGlobalState = ((globalThis as Record<string, unknown>).__craftforgeDb ??= {
  instance: null,
  pending: null,
  flushTimer: null,
  dirty: false,
}) as DbGlobalState

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  username       TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  avatar_color   TEXT NOT NULL DEFAULT '#3fc95c',
  bio            TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'user',
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id, type);

CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  summary        TEXT NOT NULL DEFAULT '',
  kind           TEXT NOT NULL DEFAULT 'addon',
  category       TEXT NOT NULL DEFAULT 'items',
  namespace      TEXT NOT NULL DEFAULT 'forge',
  target_version TEXT NOT NULL DEFAULT '1.26.52',
  icon           TEXT,
  data           TEXT NOT NULL DEFAULT '{}',
  revision       INTEGER NOT NULL DEFAULT 1,
  visibility     TEXT NOT NULL DEFAULT 'private',
  downloads      INTEGER NOT NULL DEFAULT 0,
  like_count     INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  featured       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

CREATE TABLE IF NOT EXISTS revisions (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision   INTEGER NOT NULL,
  data       TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT 'auto',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON revisions(project_id, revision DESC);

CREATE TABLE IF NOT EXISTS likes (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS downloads (
  id         TEXT PRIMARY KEY,
  project_id TEXT,
  user_id    TEXT,
  format     TEXT NOT NULL DEFAULT 'mcaddon',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  actor      TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  project_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id         TEXT PRIMARY KEY,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  action     TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

function loadFromDisk(SQL: Awaited<ReturnType<typeof initSqlJs>>): SqlJsDatabase {
  if (DB_PATH !== ':memory:' && fs.existsSync(DB_PATH)) {
    try {
      const buf = fs.readFileSync(DB_PATH)
      if (buf.length > 0) return new SQL.Database(buf)
    } catch (err) {
      console.error('[craftforge] falha ao ler banco, criando novo:', err)
      const backup = `${DB_PATH}.corrupt-${Date.now()}`
      try {
        fs.copyFileSync(DB_PATH, backup)
      } catch {
        /* ignore */
      }
    }
  }
  return new SQL.Database()
}

/**
 * Migração leve: adiciona colunas novas em bancos já existentes.
 * `CREATE TABLE IF NOT EXISTS` não altera tabelas criadas antes.
 */
const COLUMN_MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  { table: 'meta', column: 'created_at', ddl: "ALTER TABLE meta ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))" },
]

function migrateColumns(db: SqlJsDatabase): void {
  for (const migration of COLUMN_MIGRATIONS) {
    try {
      const result = db.exec(`PRAGMA table_info(${migration.table})`)
      const columns = (result[0]?.values ?? []).map((row) => String(row[1]))
      if (!columns.length || columns.includes(migration.column)) continue
      db.run(migration.ddl)
    } catch (err) {
      console.error(`[craftforge] migração ${migration.table}.${migration.column} falhou:`, err)
    }
  }
}

async function boot(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs()
  const database = loadFromDisk(SQL)
  database.run('PRAGMA foreign_keys = ON')
  database.run(SCHEMA)
  migrateColumns(database)
  flushNow(database)
  return database
}

export function getDb(): Promise<SqlJsDatabase> {
  if (globalState.instance) return Promise.resolve(globalState.instance)
  if (!globalState.pending) {
    globalState.pending = boot()
      .then((d) => {
        globalState.instance = d
        globalState.pending = null
        return d
      })
      .catch((err) => {
        globalState.pending = null
        throw err
      })
  }
  return globalState.pending
}

/* ------------------------------------------------------------------ */
/* Persistência                                                         */
/* ------------------------------------------------------------------ */

function flushNow(db: SqlJsDatabase | null = globalState.instance): void {
  if (!db || DB_PATH === ':memory:') return
  try {
    const data = Buffer.from(db.export())
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    const tmp = `${DB_PATH}.tmp-${process.pid}`
    fs.writeFileSync(tmp, data)
    fs.renameSync(tmp, DB_PATH)
    globalState.dirty = false
  } catch (err) {
    console.error('[craftforge] falha ao salvar banco:', err)
  }
}

function scheduleFlush(): void {
  globalState.dirty = true
  if (globalState.flushTimer) return
  globalState.flushTimer = setTimeout(() => {
    globalState.flushTimer = null
    flushNow()
  }, FLUSH_DEBOUNCE_MS)
  // Não segura o processo aberto por causa do timer.
  if (typeof globalState.flushTimer.unref === 'function') globalState.flushTimer.unref()
}

export function flush(): void {
  flushNow()
}

if (typeof process !== 'undefined') {
  const onExit = () => {
    if (globalState.dirty) flushNow()
  }
  process.once('exit', onExit)
  process.once('SIGINT', () => {
    onExit()
    process.exit(0)
  })
  process.once('SIGTERM', () => {
    onExit()
    process.exit(0)
  })
  process.once('beforeExit', onExit)
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                        */
/* ------------------------------------------------------------------ */

function toRows(result: { columns: string[]; values: SqlValue[][] }[]): Row[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj: Row = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb()
  db.run(sql)
  scheduleFlush()
}

export async function run(
  sql: string,
  params: SqlValue[] | Record<string, SqlValue> = [],
): Promise<{ changes: number }> {
  const db = await getDb()
  db.run(sql, params as SqlValue[])
  scheduleFlush()
  return { changes: db.getRowsModified() }
}

export async function get<T = Row>(
  sql: string,
  params: SqlValue[] | Record<string, SqlValue> = [],
): Promise<T | undefined> {
  const db = await getDb()
  const res = db.exec(sql, params as SqlValue[])
  const rows = toRows(res)
  return rows[0] as T | undefined
}

export async function all<T = Row>(
  sql: string,
  params: SqlValue[] | Record<string, SqlValue> = [],
): Promise<T[]> {
  const db = await getDb()
  const res = db.exec(sql, params as SqlValue[])
  return toRows(res) as T[]
}

/** Executa várias escritas dentro de uma transação (rollback automático). */
export async function transaction<T>(fn: () => Promise<T> | T): Promise<T> {
  const db = await getDb()
  db.run('BEGIN')
  try {
    const result = await fn()
    db.run('COMMIT')
    scheduleFlush()
    return result
  } catch (err) {
    try {
      db.run('ROLLBACK')
    } catch {
      /* noop */
    }
    throw err
  }
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

export function newId(prefix = ''): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return prefix ? `${prefix}_${hex}` : hex
}

/** Slug legível e único o bastante para URLs públicas. */
export function makeSlug(name: string): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'projeto'
  return `${base}-${nodeCrypto.randomBytes(3).toString('hex')}`
}

export const DB_FILE = DB_PATH
