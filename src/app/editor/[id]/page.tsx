import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { EditorShell } from '@/components/editor/EditorShell'
import { getProjectForOwner, parseData } from '@/lib/store'
import { validateProject } from '@/lib/generator/validate'
import { requireUserPage } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const user = await (await import('@/lib/session')).getCurrentUser()
  if (!user) return { title: 'Editor' }
  const row = await getProjectForOwner(id, user.id)
  return { title: row ? `Editando ${row.name}` : 'Editor' }
}

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUserPage(`/entrar?next=/editor/${id}`)
  const row = await getProjectForOwner(id, user.id)
  if (!row) notFound()

  const data = parseData(row)
  const validation = validateProject(data)

  return (
    <EditorShell
      projectId={row.id}
      emailVerified={user.emailVerified}
      initialValidation={validation}
      initial={{
        id: row.id,
        name: row.name,
        slug: row.slug,
        kind: row.kind,
        category: row.category,
        visibility: row.visibility,
        revision: Number(row.revision) || 1,
        data,
      }}
    />
  )
}
