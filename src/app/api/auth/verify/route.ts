import { z } from 'zod'
import type { NextRequest } from 'next/server'

import { consumeToken, issueToken, markEmailVerified } from '@/lib/auth'
import { recordActivity } from '@/lib/activity'
import { fail, guard, handle, ok, parseBody, tooManyRequests } from '@/lib/api'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/mailer'
import { getCurrentUser } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const verifySchema = z.object({ token: z.string().min(10).max(200) })
const resendSchema = z.object({ resend: z.literal(true) })

/** Confirma o e-mail a partir do token do link. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const limited = guard(`verify:${ip}`, 30, 60_000)
    if (limited) return tooManyRequests(limited)

    // Reenvio de confirmação para o usuário logado.
    const asResend = resendSchema.safeParse(await request.clone().json().catch(() => null))
    if (asResend.success) {
      const user = await getCurrentUser()
      if (!user) return fail('Você precisa estar logado.', 401, 'unauthenticated')
      const { findUserByEmail } = await import('@/lib/auth')
      const row = await findUserByEmail(user.email)
      if (!row) return fail('Conta não encontrada.', 404, 'not_found')
      if (row.email_verified === 1) return ok({ alreadyVerified: true, ok: true })
      const token = await issueToken(row.id, 'email_verify')
      await sendVerificationEmail(row.email, token)
      return ok({ sent: true })
    }

    const body = await parseBody(request, verifySchema)
    if (!body.ok) return body.response

    const user = await consumeToken(body.data.token, 'email_verify')
    if (!user) {
      return fail('Link de confirmação inválido ou expirado.', 400, 'invalid_token')
    }

    await markEmailVerified(user.id)
    await recordActivity({
      userId: user.id,
      actor: user.username,
      type: 'user.verified',
      message: `${user.username} confirmou o e-mail`,
    })

    return ok({ ok: true, email: user.email })
  })
}
