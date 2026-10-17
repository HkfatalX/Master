import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { consumeToken, createSession, setPassword, validatePassword } from '@/lib/auth'
import { clearLimit, fail, guard, handle, logAudit, ok, parseBody, tooManyRequests } from '@/lib/api'
import { SESSION_COOKIE, cookieOptions, toSessionUser } from '@/lib/session'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { resetSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const limited = guard(`reset-do:${ip}`, LIMITS.reset.limit, LIMITS.reset.windowMs)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, resetSchema)
    if (!body.ok) return body.response
    const { token, password } = body.data

    const check = validatePassword(password)
    if (!check.ok) return fail(check.message, 400, 'weak_password')

    const user = await consumeToken(token, 'password_reset')
    if (!user) return fail('Link de redefinição inválido ou expirado.', 400, 'invalid_token')

    await setPassword(user.id, password)

    // Já deixa o usuário logado com uma sessão nova.
    const { token: sessionToken, expiresAt } = await createSession(user.id, {
      ip,
      userAgent: request.headers.get('user-agent'),
    })
    const store = await cookies()
    store.set(SESSION_COOKIE, sessionToken, cookieOptions(expiresAt))

    await logAudit({ userId: user.id, action: 'password_reset', headers: request.headers })
    clearLimit(`reset-do:${ip}`)

    return ok({ ok: true, user: toSessionUser(user) })
  })
}
