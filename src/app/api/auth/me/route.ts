import type { NextRequest } from 'next/server'
import { handle, ok } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser()
    return ok({ user })
  })
}
