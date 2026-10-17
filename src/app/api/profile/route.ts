import type { NextRequest } from 'next/server'

import { fail, handle, ok, parseBody } from '@/lib/api'
import { findUserById, setPassword, updateProfile, verifyPassword } from '@/lib/auth'
import { requireUser } from '@/lib/session'
import { toSessionUser } from '@/lib/session'
import { profileSchema, passwordSchema } from '@/lib/validation'
import { logAudit } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await parseBody(request, profileSchema)
    if (!body.ok) return body.response

    const updated = await updateProfile(user.id, body.data)
    if (!updated) return fail('Não foi possível salvar seu perfil.', 400, 'update_failed')

    await logAudit({ userId: user.id, action: 'profile_update', headers: request.headers })
    return ok({ user: toSessionUser(updated) })
  })
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await parseBody(request, passwordSchema)
    if (!body.ok) return body.response

    const row = await findUserById(user.id)
    if (!row) return fail('Conta não encontrada.', 404, 'not_found')

    if (!verifyPassword(body.data.currentPassword, row.password_hash)) {
      return fail('A senha atual está incorreta.', 400, 'wrong_password')
    }

    const { validatePassword } = await import('@/lib/auth')
    const check = validatePassword(body.data.newPassword)
    if (!check.ok) return fail(check.message, 400, 'weak_password')

    await setPassword(row.id, body.data.newPassword)
    await logAudit({ userId: user.id, action: 'password_changed', headers: request.headers })

    // setPassword derruba todas as sessões: renova a desta request.
    const { createSession } = await import('@/lib/auth')
    const { cookies } = await import('next/headers')
    const { SESSION_COOKIE, cookieOptions } = await import('@/lib/session')
    const { token, expiresAt } = await createSession(row.id, {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
    })
    const store = await cookies()
    store.set(SESSION_COOKIE, token, cookieOptions(expiresAt))

    return ok({ ok: true })
  })
}
