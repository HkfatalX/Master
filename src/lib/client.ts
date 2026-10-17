'use client'

/** Helper de fetch para a API com tratamento de erro uniforme. */
export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: 'same-origin',
  })

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { error: text || 'Resposta inválida do servidor.' }
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string })?.error ?? `Erro ${response.status}. Tente novamente.`
    const error = new Error(message) as Error & {
      status: number
      payload: unknown
    }
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload as T
}

/** Formata datas no padrão brasileiro. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value.replace(' ', 'T') + (value.includes('T') ? '' : 'Z')) : value
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatRelative(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return 'agora mesmo'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min atrás`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h atrás`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d atrás`
  return formatDate(date)
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
