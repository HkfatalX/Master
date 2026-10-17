import { EventEmitter } from 'node:events'

/**
 * Barramento de eventos em memória — alimenta o SSE (`/api/stream`).
 *
 * Entrega em tempo real: saves do editor, publicações, curtidas e atividade da
 * comunidade. Os clientes reconectam sozinhos; o servidor manda heartbeat a
 * cada 15 s para manter a conexão viva atrás de proxies.
 */

export type StreamEvent = {
  id: string
  type: string
  data: unknown
  at: number
}

declare global {
  // eslint-disable-next-line no-var
  var __cfBus: EventEmitter | undefined
}

const bus: EventEmitter = globalThis.__cfBus ?? new EventEmitter()
bus.setMaxListeners(0)
if (process.env.NODE_ENV !== 'production') globalThis.__cfBus = bus

let seq = 0

export function publish(type: string, data: unknown, channel = 'global'): void {
  const event: StreamEvent = {
    id: `${Date.now().toString(36)}-${(seq++).toString(36)}`,
    type,
    data,
    at: Date.now(),
  }
  bus.emit(channel, event)
  bus.emit('global', event)
}

export function subscribe(channel: string, listener: (event: StreamEvent) => void): () => void {
  bus.on(channel, listener)
  return () => {
    bus.off(channel, listener)
  }
}

/** Canais por usuário: `user:<id>` recebe só o que é dele. */
export function userChannel(userId: string): string {
  return `user:${userId}`
}

export function projectChannel(projectId: string): string {
  return `project:${projectId}`
}
