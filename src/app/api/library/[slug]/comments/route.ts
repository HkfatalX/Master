import type { NextRequest } from 'next/server'

import { fail, guard, handle, ok, parseBody, tooManyRequests } from '@/lib/api'
import { clientIp } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import { addComment, getProjectBySlug, listComments } from '@/lib/store'
import { commentSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { slug } = await ctx.params
    const row = await getProjectBySlug(slug)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')
    return ok({ comments: await listComments(row.id, 50) })
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { slug } = await ctx.params
    const ip = clientIp(request.headers)

    const limited = guard(`comment:${user.id}`, 15, 60_000)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, commentSchema)
    if (!body.ok) return body.response

    const row = await getProjectBySlug(slug)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')
    if (row.visibility !== 'public' && row.user_id !== user.id) {
      return fail('Este projeto é privado.', 403, 'forbidden')
    }

    await addComment(row.id, user.id, body.data.body)
    return ok({ comments: await listComments(row.id, 50) }, { status: 201 })
  })
}
