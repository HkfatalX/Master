import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import {
  createSession,
  ensureAdminRole,
  destroyAllSessions,
  findUserByEmail,
  pruneExpired,
  touchLogin,
} from '@/lib/auth'
import { verifyPasswordConstantTime } from '@/lib/api-auth'
import { recordActivity } from '@/lib/activity'
import { clearLimit, fail, guard, handle, logAudit, ok, parseBody, tooManyRequests } from '@/lib/api'
import { SESSION_COOKIE, cookieOptions, toSessionUser } from '@/lib/session'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const body = await parseBody(request, loginSchema)
    if (!body.ok) return body.response
    const { email, password } = body.data

    const limited = guard(`login:${ip}:${email}`, LIMITS.login.limit, LIMITS.login.windowMs)
    if (limited) return tooManyRequests(limited)

    const user = await findUserByEmail(email)
    const valid = verifyPasswordConstantTime(password, user?.password_hash)

    if (!user || !valid) {
      await logAudit({
        action: 'login_failed',
        detail: email,
        headers: request.headers,
      })
      return fail('E-mail ou senha incorretos.', 401, 'invalid_credentials')
    }

    const account = await ensureAdminRole(user)

    await pruneExpired()
    // Limita o número de sessões simultâneas por conta.
    const sessions = await countSessions(account.id)
    if (sessions > 20) await destroyAllSessions(account.id)

    const { token, expiresAt } = await createSession(account.id, {
      ip,
      userAgent: request.headers.get('user-agent'),
    })
    await touchLogin(account.id)

    const store = await cookies()
    store.set(SESSION_COOKIE, token, cookieOptions(expiresAt))

    await logAudit({ userId: user.id, action: 'login', detail: email, headers: request.headers })
    clearLimit(`login:${ip}:${email}`)

    return ok({ user: toSessionUser(account) })
  })
}

async function countSessions(userId: string): Promise<number> {
  const { get } = await import('@/lib/db')
  const row = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?`, [
    userId,
  ])
  return Number(row?.n ?? 0)
}
