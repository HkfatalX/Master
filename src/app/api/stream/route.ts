import type { NextRequest } from 'next/server'
import { subscribe, userChannel, type StreamEvent } from '@/lib/events'
import { getCurrentUser } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-Sent Events: entrega em tempo real saves do editor, publicações,
 * curtidas e atividade da comunidade. Heartbeat a cada 15 s mantém a conexão
 * viva atrás de proxies.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  const channel = user ? userChannel(user.id) : null

  const encoder = new TextEncoder()
  let unsubscribeGlobal: (() => void) | null = null
  let unsubscribeUser: (() => void) | null = null
  let heartbeat: NodeJS.Timeout | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: unknown, id?: string) => {
        if (closed) return
        try {
          const lines = [`event: ${event}`]
          if (id) lines.push(`id: ${id}`)
          lines.push(`data: ${JSON.stringify(payload)}`, '', '')
          controller.enqueue(encoder.encode(lines.join('\n')))
        } catch {
          cleanup()
        }
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        unsubscribeGlobal?.()
        unsubscribeUser?.()
        if (heartbeat) clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          /* já fechado */
        }
      }

      send('ready', { ok: true, at: Date.now(), channel: channel ?? 'anonymous' })

      const onEvent = (event: StreamEvent) => send(event.type, event.data, event.id)
      unsubscribeGlobal = subscribe('global', onEvent)
      if (channel) unsubscribeUser = subscribe(channel, onEvent)

      heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          cleanup()
        }
      }, 15_000)
      if (typeof heartbeat.unref === 'function') heartbeat.unref()

      request.signal.addEventListener('abort', cleanup)
      if (request.signal.aborted) cleanup()
    },
    cancel() {
      closed = true
      unsubscribeGlobal?.()
      unsubscribeUser?.()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}
