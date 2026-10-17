import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProjectPage } from '@/components/ProjectPage'
import { getProjectBySlug, hasLiked, listComments, parseData, toCard } from '@/lib/store'
import { buildPack } from '@/lib/generator/pack'
import { getCurrentUser } from '@/lib/session'
import { get } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getProjectBySlug(slug)
  if (!row) return { title: 'Projeto não encontrado' }
  return {
    title: row.name,
    description: row.summary || `Addon de Minecraft Bedrock feito no CraftForge: ${row.name}`,
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const row = await getProjectBySlug(slug)
  if (!row) notFound()

  const user = await getCurrentUser()
  const isOwner = Boolean(user && row.user_id === user.id)
  if (row.visibility !== 'public' && !isOwner) notFound()

  const author = await get<{ id: string; username: string; display_name: string; avatar_color: string; bio: string }>(
    `SELECT id, username, display_name, avatar_color, bio FROM users WHERE id = ?`,
    [row.user_id],
  )

  const data = parseData(row)
  const pack = buildPack(data, { projectId: row.id, kind: row.kind })
  const totalSize = pack.files.reduce((sum, f) => sum + f.content.length, 0)
  const comments = await listComments(row.id, 50)
  const liked = user ? await hasLiked(row.id, user.id) : false

  const { incrementViews } = await import('@/lib/store')
  if (!isOwner) await incrementViews(row.id)

  return (
    <ProjectPage
      project={{
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
      }}
      fileCount={pack.files.length}
      totalSize={totalSize}
      liked={liked}
      comments={comments}
      isOwner={isOwner}
      isAuthenticated={Boolean(user)}
    />
  )
}
