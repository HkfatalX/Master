import type { NextRequest } from 'next/server'
import { handle, ok } from '@/lib/api'
import { listActivity } from '@/lib/store'
import { getVersions } from '@/lib/versions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handle(async () => {
    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))
    return ok({
      activity: await listActivity(limit),
      versions: await getVersions(),
      serverTime: new Date().toISOString(),
    })
  })
}
