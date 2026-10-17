import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { fail, handle, ok, parseBody } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { recordActivity } from '@/lib/activity'
import { getVersions, resetVersions, setVersions } from '@/lib/versions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const versionSchema = z.object({
  id: z.string().trim().max(20),
  release: z.string().trim().max(20),
  label: z.string().trim().max(60),
  releasedAt: z.string().trim().max(20),
  kind: z.enum(['stable', 'preview']),
  notes: z.string().trim().max(400).default(''),
})

const patchSchema = z.object({
  bedrock: versionSchema.optional(),
  java: versionSchema.optional(),
  preview: versionSchema.optional(),
})

/**
 * Atualiza as versões do Minecraft sem precisar de deploy.
 * Requer conta com role "admin" (defina CRAFTFORGE_ADMIN_EMAIL antes de criar a conta).
 */
export async function GET(_request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'admin') return fail('Acesso restrito a administradores.', 403, 'forbidden')
    return ok({ versions: await getVersions() })
  })
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'admin') return fail('Acesso restrito a administradores.', 403, 'forbidden')

    const body = await parseBody(request, patchSchema)
    if (!body.ok) return body.response

    const versions = await setVersions(body.data)
    await recordActivity({
      userId: user.id,
      actor: user.username,
      type: 'admin.versions',
      message: `atualizou as versões para Bedrock ${versions.bedrock.id}`,
    })

    return ok({ versions })
  })
}

export async function DELETE(_request: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'admin') return fail('Acesso restrito a administradores.', 403, 'forbidden')
    return ok({ versions: await resetVersions() })
  })
}
