import type { NextRequest } from 'next/server'

import { findUserByEmail, issueToken } from '@/lib/auth'
import { logAudit } from '@/lib/api'
import { guard, handle, ok, parseBody, tooManyRequests } from '@/lib/api'
import { sendPasswordResetEmail } from '@/lib/mailer'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { forgotSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sempre responde 200, existindo a conta ou não — responder diferente
 * revelaria quais e-mails estão cadastrados.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const limited = guard(`reset:${ip}`, LIMITS.reset.limit, LIMITS.reset.windowMs)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, forgotSchema)
    if (!body.ok) return body.response

    const user = await findUserByEmail(body.data.email)
    if (user) {
      try {
        const token = await issueToken(user.id, 'password_reset', 1000 * 60 * 60)
        await sendPasswordResetEmail(user.email, token)
      } catch (err) {
        console.error('[craftforge] falha ao enviar reset:', err)
      }
    }

    await logAudit({
      userId: user?.id ?? null,
      action: 'password_reset_requested',
      detail: body.data.email,
      headers: request.headers,
    })

    return ok({
      ok: true,
      message: 'Se o e-mail estiver cadastrado, enviamos um link de redefinição.',
    })
  })
}
