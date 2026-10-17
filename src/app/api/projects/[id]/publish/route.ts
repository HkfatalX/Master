import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { fail, handle, ok, parseBody } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { getProjectForOwner, setVisibility, duplicateProject } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const publishSchema = z.object({ visibility: z.enum(['private', 'public']) })

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params

    const body = await parseBody(request, publishSchema)
    if (!body.ok) return body.response

    const row = await getProjectForOwner(id, user.id)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')

    if (body.data.visibility === 'public' && !user.emailVerified) {
      return fail(
        'Confirme seu e-mail antes de publicar na biblioteca.',
        403,
        'email_not_verified',
      )
    }

    const changed = await setVisibility(id, user.id, body.data.visibility)
    if (!changed) return fail('Não foi possível alterar a visibilidade.', 400, 'update_failed')

    return ok({ ok: true, visibility: body.data.visibility })
  })
}

export async function PUT(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const newId = await duplicateProject(id, user.id)
    if (!newId) return fail('Projeto não encontrado.', 404, 'not_found')
    return ok({ ok: true, id: newId }, { status: 201 })
  })
}
