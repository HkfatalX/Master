import { newId, run } from './db'
import { publish } from './events'

/**
 * Registra atividade no banco e entrega em tempo real via SSE.
 * Nunca deixa uma falha de log derrubar a request principal.
 */
export async function recordActivity(entry: {
  userId?: string | null
  type: string
  message: string
  projectId?: string | null
  actor?: string
  channel?: string
  tab?: string
}): Promise<void> {
  try {
    await run(
      `INSERT INTO activity (id, user_id, actor, type, message, project_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        newId('act'),
        entry.userId ?? null,
        entry.actor ?? '',
        entry.type,
        entry.message.slice(0, 240),
        entry.projectId ?? null,
      ],
    )
    publish(
      entry.type,
      {
        message: entry.message,
        actor: entry.actor ?? null,
        projectId: entry.projectId ?? null,
        tab: entry.tab ?? null,
      },
      entry.channel ?? 'global',
    )
  } catch (err) {
    console.error('[craftforge] falha ao registrar atividade:', err)
  }
}

export async function audit(entry: {
  userId?: string | null
  action: string
  detail?: string
  ip?: string | null
}): Promise<void> {
  try {
    await run(`INSERT INTO audit_log (id, user_id, action, detail, ip) VALUES (?, ?, ?, ?, ?)`, [
      newId('log'),
      entry.userId ?? null,
      entry.action,
      (entry.detail ?? '').slice(0, 500),
      entry.ip ?? null,
    ])
  } catch {
    /* auditoria nunca derruba a request */
  }
}
