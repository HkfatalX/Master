import type { NextRequest } from 'next/server'

import { fail, guard, handle, ok, parseBody, tooManyRequests } from '@/lib/api'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import {
  deleteProject,
  duplicateProject,
  getProjectForOwner,
  listRevisions,
  saveProject,
  setVisibility,
  toCard,
} from '@/lib/store'
import { saveProjectSchema } from '@/lib/validation'
import { validateProject } from '@/lib/generator/validate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const row = await getProjectForOwner(id, user.id)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')

    const data = (await import('@/lib/store')).parseData(row)
    const validation = validateProject(data)
    const revisions = await listRevisions(id)

    return ok({
      project: {
        ...toCard(row),
        data,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
        },
      },
      validation,
      revisions,
    })
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const ip = clientIp(request.headers)

    const limited = guard(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, saveProjectSchema)
    if (!body.ok) return body.response
    const { data, name, summary, icon, category, revision, label, tab } = body.data

    const validation = validateProject(data)
    if (!validation.ok) {
      return ok(
        {
          error: 'Corrija os erros antes de salvar.',
          code: 'validation_failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 422 },
      )
    }

    const result = await saveProject(id, user.id, {
      data,
      name,
      summary,
      icon,
      category,
      expectedRevision: revision,
      label,
    })

    if (!result.ok) {
      if (result.reason === 'not_found') return fail('Projeto não encontrado.', 404, 'not_found')
      return ok(
        {
          error: 'Este projeto foi alterado em outra aba ou dispositivo.',
          code: 'conflict',
          revision: result.revision,
          data: result.data,
          updatedAt: result.updatedAt,
        },
        { status: 409 },
      )
    }

    const { recordActivity } = await import('@/lib/activity')
    await recordActivity({
      userId: user.id,
      actor: user.username,
      type: 'project.save',
      message: `salvou "${name ?? 'projeto'}"`,
      projectId: id,
      channel: `user:${user.id}`,
      tab,
    })

    return ok({ ok: true, revision: result.revision, updatedAt: result.updatedAt, warnings: validation.warnings })
  })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const removed = await deleteProject(id, user.id)
    if (!removed) return fail('Projeto não encontrado.', 404, 'not_found')
    return ok({ ok: true })
  })
}
