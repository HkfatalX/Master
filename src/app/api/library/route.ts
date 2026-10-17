import type { NextRequest } from 'next/server'

import { guard, handle, ok, tooManyRequests } from '@/lib/api'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { listPublicProjects, stats } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handle(async () => {
    const ip = clientIp(request.headers)
    const limited = guard(`search:${ip}`, LIMITS.search.limit, LIMITS.search.windowMs)
    if (limited) return tooManyRequests(limited)

    const url = new URL(request.url)
    const result = await listPublicProjects({
      q: url.searchParams.get('q') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      sort: (url.searchParams.get('sort') as 'recent' | 'downloads' | 'likes') ?? 'recent',
      page: Number(url.searchParams.get('page') ?? 1),
      limit: Number(url.searchParams.get('limit') ?? 12),
    })

    return ok({ ...result, stats: await stats() })
  })
}
