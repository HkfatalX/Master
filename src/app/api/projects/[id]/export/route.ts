import type { NextRequest } from 'next/server'

import { fail, guard, handle, tooManyRequests } from '@/lib/api'
import { clientIp, LIMITS } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/session'
import { getProjectRow, parseData, recordDownload } from '@/lib/store'
import { buildPack, type PackFile } from '@/lib/generator/pack'
import { validateProject } from '@/lib/generator/validate'
import { safeFileName, zipPack } from '@/lib/generator/zip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const FORMATS = new Set(['mcaddon', 'zip', 'bp', 'rp'])

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser()
    const { id } = await ctx.params
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') ?? 'mcaddon').toLowerCase()
    if (!FORMATS.has(format)) return fail('Formato inválido.', 400, 'bad_format')

    const ip = clientIp(request.headers)
    const limited = guard(`export:${user?.id ?? ip}`, LIMITS.export.limit, LIMITS.export.windowMs)
    if (limited) return tooManyRequests(limited)

    const row = await getProjectRow(id)
    if (!row) return fail('Projeto não encontrado.', 404, 'not_found')

    const isOwner = Boolean(user && row.user_id === user.id)
    if (row.visibility !== 'public' && !isOwner) {
      return fail('Este projeto é privado.', 403, 'forbidden')
    }

    const data = parseData(row)
    const validation = validateProject(data)
    if (!validation.ok) {
      return new Response(
        JSON.stringify({
          error: 'Corrija os erros antes de exportar.',
          code: 'validation_failed',
          errors: validation.errors,
        }),
        { status: 422, headers: { 'content-type': 'application/json' } },
      )
    }

    const pack = buildPack(data, { projectId: row.id, kind: row.kind })

    let files: PackFile[] = pack.files
    if (format === 'bp') {
      files = pack.files.filter((f) => f.path.includes('_BP/') || f.path.startsWith('world_') || f.path === 'MUNDO.txt')
    } else if (format === 'rp') {
      files = pack.files.filter((f) => f.path.includes('_RP/'))
    }
    if (!files.length) return fail('Nada para exportar neste formato.', 400, 'empty_export')

    const buffer = await zipPack(files)
    await recordDownload(row.id, user?.id ?? null, format)

    const extension = format === 'mcaddon' ? 'mcaddon' : 'zip'
    const fileName = safeFileName(row.name, extension)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="${fileName}"`,
        'content-length': String(buffer.length),
        'cache-control': 'no-store',
        'x-craftforge-warnings': encodeURIComponent(pack.warnings.join(' | ').slice(0, 300)),
      },
    })
  })
}
