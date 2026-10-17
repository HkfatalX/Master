import type { NextRequest } from 'next/server'

import { guard, handle, ok, parseBody, tooManyRequests } from '@/lib/api'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import { countUserProjects, FREE_PROJECT_LIMIT } from '@/lib/session'
import { createProject, listUserProjects } from '@/lib/store'
import { createProjectSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const projects = await listUserProjects(user.id)
    const used = await countUserProjects(user.id)
    return ok({
      projects,
      limit: FREE_PROJECT_LIMIT,
      used,
      canCreate: used < FREE_PROJECT_LIMIT,
    })
  })
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const ip = clientIp(request.headers)
    const limited = guard(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)
    if (limited) return tooManyRequests(limited)

    const body = await parseBody(request, createProjectSchema)
    if (!body.ok) return body.response

    const used = await countUserProjects(user.id)
    if (used >= FREE_PROJECT_LIMIT) {
      return ok({ error: `Você atingiu o limite de ${FREE_PROJECT_LIMIT} projetos.` }, { status: 403 })
    }

    const created = await createProject({
      userId: user.id,
      name: body.data.name,
      template: body.data.template,
      category: body.data.category,
    })

    return ok(created, { status: 201 })
  })
}
