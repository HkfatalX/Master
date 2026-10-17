import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { destroySession } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { SESSION_COOKIE } from '@/lib/session'
import { getCurrentUser } from '@/lib/session'
import { logAudit } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handle(async () => {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    const user = await getCurrentUser()

    await destroySession(token)
    store.delete(SESSION_COOKIE)

    if (user) {
      await logAudit({ userId: user.id, action: 'logout', headers: request.headers })
    }

    return ok({ ok: true })
  })
}
