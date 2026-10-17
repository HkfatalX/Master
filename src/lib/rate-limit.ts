/**
 * Rate limiting em memória (sliding window).
 *
 * Suficiente para um deploy single-instance e para o preview. Em deploy com
 * múltiplas instâncias, troque por Redis/Upstash — a interface é a mesma.
 */

type Bucket = { hits: number[] }

declare global {
  // eslint-disable-next-line no-var
  var __cfRateLimit: Map<string, Bucket> | undefined
}

const store: Map<string, Bucket> = globalThis.__cfRateLimit ?? new Map()
if (process.env.NODE_ENV !== 'production') globalThis.__cfRateLimit = store

export type RateLimitResult = {
  ok: boolean
  remaining: number
  limit: number
  resetAt: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    const resetAt = oldest + windowMs
    store.set(key, bucket)
    return {
      ok: false,
      remaining: 0,
      limit,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }

  bucket.hits.push(now)
  store.set(key, bucket)

  // Evita crescimento infinito do mapa em processos longos.
  if (store.size > 20000) {
    for (const [k, v] of store) {
      if (v.hits.every((t) => now - t >= windowMs)) store.delete(k)
    }
  }

  return {
    ok: true,
    remaining: limit - bucket.hits.length,
    limit,
    resetAt: now + windowMs,
    retryAfterSeconds: 0,
  }
}

export function resetRateLimit(key: string): void {
  store.delete(key)
}

/** IP do cliente considerando proxies (Vercel/e2b). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? 'unknown'
}

/** Presets usados nas rotas. */
export const LIMITS = {
  login: { limit: 8, windowMs: 60_000 },
  signup: { limit: 5, windowMs: 60_000 * 10 },
  reset: { limit: 5, windowMs: 60_000 * 15 },
  write: { limit: 120, windowMs: 60_000 },
  export: { limit: 30, windowMs: 60_000 },
  search: { limit: 120, windowMs: 60_000 },
} as const
