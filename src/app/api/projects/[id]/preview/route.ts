import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { fail, handle, ok } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { getProjectForOwner, parseData, saveProject } from '@/lib/store'
import { buildPack } from '@/lib/generator/pack'
import { validateProject } from '@/lib/generator/validate'
import { projectDataSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Devolve a árvore de arquivos e o conteúdo dos JSONs que o pack vai gerar.
 * É o que alimenta o painel "Arquivos gerados" do editor.
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const row = await getProjectForOwner(id, user.id)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')

    const data = parseData(row)
    const pack = buildPack(data, { projectId: row.id, kind: row.kind })
    const validation = validateProject(data)

    const tree = pack.files
      .filter((f) => f.path.endsWith('.json') || f.path.endsWith('.png') || f.path.endsWith('.txt'))
      .map((f) => {
        const isJson = f.path.endsWith('.json')
        const isImage = f.path.endsWith('.png')
        return {
          path: f.path,
          size: f.content.length,
          type: isJson ? ('json' as const) : isImage ? ('image' as const) : ('text' as const),
          content: isImage ? null : f.content.toString('utf8').slice(0, 60_000),
        }
      })
      .sort((a, b) => a.path.localeCompare(b.path))

    return ok({
      tree,
      totalSize: pack.files.reduce((sum, f) => sum + f.content.length, 0),
      validation,
      warnings: pack.warnings,
      bpUuid: pack.bpUuid,
      rpUuid: pack.rpUuid,
    })
  })
}

const restoreSchema = z.object({ revisionId: z.string().min(10).max(60) })

/** Restaura um snapshot do histórico. */
export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const raw = await request.json().catch(() => null)
    const parsed = restoreSchema.safeParse(raw)
    if (!parsed.success) return fail('Requisição inválida.', 400, 'bad_request')

    const { getRevision } = await import('@/lib/store')
    const revision = await getRevision(id, parsed.data.revisionId)
    if (!revision) return fail('Versão não encontrada.', 404, 'not_found')

    const data = projectDataSchema.parse(JSON.parse(revision.data))
    const result = await saveProject(id, user.id, { data, label: 'manual' })
    if (!result.ok && result.reason === 'not_found') {
      return fail('Projeto não encontrado.', 404, 'not_found')
    }
    if (!result.ok) return fail('Conflito ao restaurar. Recarregue a página.', 409, 'conflict')

    return ok({ ok: true, revision: result.revision, data })
  })
}
