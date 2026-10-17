import type { NextRequest } from 'next/server'

import { fail, handle, ok } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { getProjectBySlug, toggleLike } from '@/lib/store'
import { recordActivity } from '@/lib/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function POST(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { slug } = await ctx.params

    const row = await getProjectBySlug(slug)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')
    if (row.visibility !== 'public' && row.user_id !== user.id) {
      return fail('Este projeto é privado.', 403, 'forbidden')
    }

    const result = await toggleLike(row.id, user.id)

    if (result.liked && row.user_id !== user.id) {
      await recordActivity({
        userId: user.id,
        actor: user.username,
        type: 'project.like',
        message: `curtiu "${row.name}"`,
        projectId: row.id,
      })
    }

    return ok(result)
  })
}
