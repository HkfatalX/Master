import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { findUserBySessionToken, SESSION_TTL_MS, type UserRow } from './auth'
import { get } from './db'

export const SESSION_COOKIE = 'cf_session'

export type SessionUser = {
  id: string
  email: string
  username: string
  displayName: string
  avatarColor: string
  bio: string
  role: string
  emailVerified: boolean
  createdAt: string
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    bio: row.bio,
    role: row.role,
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
  }
}

/** Usuário logado nesta request (ou null). Nunca lança. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const row = await findUserBySessionToken(token)
    return row ? toSessionUser(row) : null
  } catch {
    return null
  }
}

/** Exige sessão. Lança um `Response` 401 pronto para ser devolvido. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw Response.json({ error: 'Você precisa estar logado.' }, { status: 401 })
  }
  return user
}

/** Exige sessão em Server Component — redireciona para o login. */
export async function requireUserPage(redirectTo = '/login'): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect(redirectTo)
  return user
}

export const SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000)

export function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/' as const,
    expires: expiresAt,
  }
}

export async function countUserProjects(userId: string): Promise<number> {
  const row = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM projects WHERE user_id = ?`,
    [userId],
  )
  return Number(row?.n ?? 0)
}

/** Limite de projetos por conta (plano gratuito). */
export const FREE_PROJECT_LIMIT = 50
