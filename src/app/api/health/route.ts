import { handle, ok } from '@/lib/api'
import { DB_FILE, get } from '@/lib/db'
import { getVersions } from '@/lib/versions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handle(async () => {
    await get(`SELECT 1 AS ok`)
    return ok({
      status: 'ok',
      db: DB_FILE.replace(process.cwd(), '.'),
      minecraft: { ...(await getVersions()) },
      time: new Date().toISOString(),
      node: process.version,
    })
  })
}
