import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import {
  assertEmail,
  assertUsername,
  AuthError,
  createSession,
  createUser,
  issueToken,
  pruneExpired,
  validatePassword,
} from '@/lib/auth'
import { recordActivity } from '@/lib/activity'
import { clearLimit, fail, guard, handle, logAudit, ok, parseBody, tooManyRequests } from '@/lib/api'
import { SESSION_COOKIE, cookieOptions, toSessionUser } from '@/lib/session'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/mailer'
import { signupSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const limited = guard(`signup:${ip}`, LIMITS.signup.limit, LIMITS.signup.windowMs)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, signupSchema)
    if (!body.ok) return body.response
    const { email, username, displayName, password } = body.data

    const check = validatePassword(password)
    if (!check.ok) return fail(check.message, 400, 'weak_password')

    try {
      assertEmail(email)
      assertUsername(username)
    } catch (err) {
      if (err instanceof AuthError) return fail(err.message, err.status, err.code)
      throw err
    }

    let user
    try {
      user = await createUser({ email, username, displayName: displayName ?? '', password })
    } catch (err) {
      if (err instanceof AuthError) return fail(err.message, err.status, err.code)
      throw err
    }

    await pruneExpired()
    const { token, expiresAt } = await createSession(user.id, {
      ip,
      userAgent: request.headers.get('user-agent'),
    })

    const store = await cookies()
    store.set(SESSION_COOKIE, token, cookieOptions(expiresAt))

    // E-mail de confirmação (vai para a caixa de saída interna em /caixa-de-entrada).
    try {
      const verifyToken = await issueToken(user.id, 'email_verify')
      await sendVerificationEmail(user.email, verifyToken)
    } catch (err) {
      console.error('[craftforge] falha ao enviar verificação:', err)
    }

    await recordActivity({
      userId: user.id,
      actor: user.username,
      type: 'user.signup',
      message: `${user.username} entrou no CraftForge`,
    })
    await logAudit({ userId: user.id, action: 'signup', detail: user.email, headers: request.headers })

    clearLimit(`signup:${ip}`)

    return ok(
      {
        user: toSessionUser(user),
        message: 'Conta criada! Enviamos um e-mail de confirmação.',
      },
      { status: 201 },
    )
  })
}
