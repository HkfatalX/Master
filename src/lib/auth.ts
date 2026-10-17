import crypto from 'node:crypto'
import { all, get, newId, run } from './db'

/**
 * Autenticação do CraftForge.
 *
 * - Senhas: scrypt (crypto nativo) com salt de 16 bytes, N=16384.
 * - Sessões: token opaco de 32 bytes; só o SHA-256 vai para o banco.
 *   O cookie nunca carrega dados do usuário e pode ser revogado no servidor.
 * - Toda comparação usa `timingSafeEqual` (tempo constante).
 * - Trocar/ resetar senha derruba todas as sessões do usuário.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 }

const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'senha123',
  'minecraft', 'minecraft123', 'qwerty123', 'iloveyou', 'abc12345', 'letmein',
  'admin123', 'welcome1', '123123123', 'craftforge', 'notch', 'steve', 'alex',
])

export class AuthError extends Error {
  status: number
  code: string
  constructor(message: string, code = 'auth_error', status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password.normalize('NFKC'), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT.maxmem,
  })
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'scrypt') return false
    const expected = Buffer.from(hashB64, 'base64')
    if (expected.length === 0) return false
    const derived = crypto.scryptSync(
      password.normalize('NFKC'),
      Buffer.from(saltB64, 'base64'),
      expected.length,
      { N: Number(n) || SCRYPT.N, r: Number(r) || SCRYPT.r, p: Number(p) || SCRYPT.p, maxmem: SCRYPT.maxmem },
    )
    return crypto.timingSafeEqual(expected, derived)
  } catch {
    return false
  }
}

export function validatePassword(password: string): { ok: true } | { ok: false; message: string } {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, message: 'A senha precisa ter pelo menos 8 caracteres.' }
  }
  if (password.length > 200) {
    return { ok: false, message: 'A senha é longa demais (máximo 200 caracteres).' }
  }
  if (!/[a-zA-ZÀ-ÿ]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'A senha precisa ter ao menos uma letra e um número.' }
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, message: 'Essa senha é muito comum. Escolha outra.' }
  }
  return { ok: true }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

export function assertEmail(email: string): string {
  const value = normalizeEmail(email)
  if (!value) throw new AuthError('Informe um e-mail.', 'email_required')
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    throw new AuthError('E-mail inválido.', 'email_invalid')
  }
  return value
}

const RESERVED_USERNAMES = new Set([
  'admin', 'root', 'system', 'moderator', 'support', 'craftforge',
  'mojang', 'minecraft', 'notch', 'help', 'api', 'sobre', 'contato',
])

export function assertUsername(username: string): string {
  const value = String(username ?? '').trim().toLowerCase()
  if (!USERNAME_RE.test(value)) {
    throw new AuthError(
      'O nome de usuário deve ter 3 a 20 caracteres, usando letras minúsculas, números e "_".',
      'username_invalid',
    )
  }
  if (RESERVED_USERNAMES.has(value)) {
    throw new AuthError('Esse nome de usuário é reservado.', 'username_reserved')
  }
  return value
}

/* ------------------------------------------------------------------ */
/* Tipos                                                                */
/* ------------------------------------------------------------------ */

export type UserRow = {
  id: string
  email: string
  username: string
  display_name: string
  password_hash: string
  avatar_color: string
  bio: string
  role: string
  email_verified: number
  created_at: string
  updated_at: string
  last_login_at: string | null
}

const AVATAR_COLORS = ['#3fc95c', '#4aa8ff', '#ffb545', '#ff6b6b', '#b06bff', '#2fd4c4', '#f472b6']

export function pickAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/* ------------------------------------------------------------------ */
/* Tokens                                                               */
/* ------------------------------------------------------------------ */

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/* ------------------------------------------------------------------ */
/* Usuários                                                             */
/* ------------------------------------------------------------------ */

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return get<UserRow>(`SELECT * FROM users WHERE email = ?`, [normalizeEmail(email)])
}

export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  return get<UserRow>(`SELECT * FROM users WHERE username = ?`, [String(username).toLowerCase()])
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  return get<UserRow>(`SELECT * FROM users WHERE id = ?`, [id])
}

export async function createUser(input: {
  email: string
  username: string
  displayName: string
  password: string
}): Promise<UserRow> {
  const email = assertEmail(input.email)
  const username = assertUsername(input.username)

  if (await findUserByEmail(email)) {
    throw new AuthError('Já existe uma conta com este e-mail.', 'email_taken', 409)
  }
  if (await findUserByUsername(username)) {
    throw new AuthError('Este nome de usuário já está em uso.', 'username_taken', 409)
  }

  const id = newId('usr')
  const displayName = (input.displayName || username).toString().trim().slice(0, 40) || username

  // O e-mail definido em CRAFTFORGE_ADMIN_EMAIL vira administrador no cadastro.
  const adminEmail = normalizeEmail(process.env.CRAFTFORGE_ADMIN_EMAIL ?? '')
  const role = adminEmail && adminEmail === email ? 'admin' : 'user'

  await run(
    `INSERT INTO users (id, email, username, display_name, password_hash, avatar_color, role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, email, username, displayName, hashPassword(input.password), pickAvatarColor(username), role],
  )

  const created = await findUserById(id)
  if (!created) throw new AuthError('Não foi possível criar a conta.', 'create_failed', 500)
  return created
}

/* ------------------------------------------------------------------ */
/* Sessões                                                              */
/* ------------------------------------------------------------------ */

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  await pruneExpired()
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await run(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      newId('ses'),
      userId,
      sha256(token),
      expiresAt.toISOString(),
      meta.ip?.slice(0, 64) ?? null,
      (meta.userAgent ?? '').slice(0, 300) || null,
    ],
  )
  return { token, expiresAt }
}

export async function findUserBySessionToken(
  token: string | undefined | null,
): Promise<UserRow | null> {
  if (!token) return null
  const row = await get<UserRow>(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), new Date().toISOString()],
  )
  return row ?? null
}

export async function destroySession(token: string | undefined | null): Promise<void> {
  if (!token) return
  await run(`DELETE FROM sessions WHERE token_hash = ?`, [sha256(token)])
}

export async function destroyAllSessions(userId: string): Promise<number> {
  const { changes } = await run(`DELETE FROM sessions WHERE user_id = ?`, [userId])
  return changes
}

export async function pruneExpired(): Promise<void> {
  const now = new Date().toISOString()
  await run(`DELETE FROM sessions WHERE expires_at <= ?`, [now])
  await run(`DELETE FROM tokens WHERE expires_at <= ? OR used_at IS NOT NULL`, [now])
}

/* ------------------------------------------------------------------ */
/* Tokens de verificação / reset de senha                               */
/* ------------------------------------------------------------------ */

export type TokenPurpose = 'email_verify' | 'password_reset'

export async function issueToken(
  userId: string,
  purpose: TokenPurpose,
  ttlMs = 1000 * 60 * 60 * 24,
): Promise<string> {
  const token = randomToken(32)
  await run(
    `INSERT INTO tokens (id, user_id, type, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [newId('tok'), userId, purpose, sha256(token), new Date(Date.now() + ttlMs).toISOString()],
  )
  return token
}

export async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<UserRow | null> {
  if (!token) return null
  const row = await get<UserRow & { token_id: string }>(
    `SELECT t.id AS token_id, u.* FROM tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.type = ? AND t.expires_at > ? AND t.used_at IS NULL`,
    [sha256(token), purpose, new Date().toISOString()],
  )
  if (!row) return null
  await run(`UPDATE tokens SET used_at = datetime('now') WHERE id = ?`, [row.token_id])
  const { token_id: _drop, ...user } = row
  return user as UserRow
}

/* ------------------------------------------------------------------ */
/* Perfil                                                               */
/* ------------------------------------------------------------------ */

export async function updateProfile(
  userId: string,
  patch: { displayName?: string; bio?: string; avatarColor?: string },
): Promise<UserRow | undefined> {
  const fields: string[] = []
  const values: (string | null)[] = []

  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim().slice(0, 40)
    if (!name) throw new AuthError('O nome não pode ficar vazio.', 'name_empty')
    fields.push('display_name = ?')
    values.push(name)
  }
  if (patch.bio !== undefined) {
    fields.push('bio = ?')
    values.push(patch.bio.trim().slice(0, 280))
  }
  if (patch.avatarColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(patch.avatarColor)) {
      throw new AuthError('Cor inválida.', 'color_invalid')
    }
    fields.push('avatar_color = ?')
    values.push(patch.avatarColor)
  }
  if (!fields.length) return findUserById(userId)

  fields.push("updated_at = datetime('now')")
  await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, userId])
  return findUserById(userId)
}

export async function setPassword(userId: string, newPassword: string): Promise<void> {
  await run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [
    hashPassword(newPassword),
    userId,
  ])
  await destroyAllSessions(userId)
}

export async function markEmailVerified(userId: string): Promise<void> {
  await run(`UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?`, [
    userId,
  ])
}

/**
 * Promove a conta configurada em CRAFTFORGE_ADMIN_EMAIL.
 * Roda no login, então dá para promover (ou trocar) o admin sem recriar a conta.
 */
export async function ensureAdminRole(user: UserRow): Promise<UserRow> {
  const adminEmail = normalizeEmail(process.env.CRAFTFORGE_ADMIN_EMAIL ?? '')
  if (!adminEmail || user.email !== adminEmail || user.role === 'admin') return user
  await run(`UPDATE users SET role = 'admin' WHERE id = ?`, [user.id])
  return { ...user, role: 'admin' }
}

export async function touchLogin(userId: string): Promise<void> {
  await run(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, [userId])
}

export async function listSessions(userId: string) {
  return all<{ id: string; created_at: string; expires_at: string; ip: string | null; user_agent: string | null }>(
    `SELECT id, created_at, expires_at, ip, user_agent FROM sessions
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  )
}
