import type { NextRequest } from 'next/server'

import { fail, handle, ok } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import {
  getProjectBySlug,
  hasLiked,
  incrementViews,
  listComments,
  parseData,
  toCard,
} from '@/lib/store'
import { buildPack } from '@/lib/generator/pack'
import { validateProject } from '@/lib/generator/validate'
import { get } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { slug } = await ctx.params
    const row = await getProjectBySlug(slug)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')

    const user = await getCurrentUser()
    const isOwner = Boolean(user && row.user_id === user.id)
    if (row.visibility !== 'public' && !isOwner) {
      return fail('Este projeto é privado.', 403, 'forbidden')
    }

    const author = await get<{ id: string; username: string; display_name: string; avatar_color: string; bio: string }>(
      `SELECT id, username, display_name, avatar_color, bio FROM users WHERE id = ?`,
      [row.user_id],
    )

    const data = parseData(row)
    const pack = buildPack(data, { projectId: row.id, kind: row.kind })
    const manifest = JSON.parse(
      pack.files.find((f) => f.path.endsWith('_BP/manifest.json'))!.content.toString('utf8'),
    )

    if (!isOwner) await incrementViews(row.id)

    return ok({
      project: {
        ...toCard(row),
        data,
        author: author
          ? {
              id: author.id,
              username: author.username,
              displayName: author.display_name,
              avatarColor: author.avatar_color,
              bio: author.bio,
            }
          : null,
      },
      manifest,
      fileCount: pack.files.length,
      validation: validateProject(data),
      liked: user ? await hasLiked(row.id, user.id) : false,
      comments: await listComments(row.id, 20),
      isOwner,
    })
  })
}
