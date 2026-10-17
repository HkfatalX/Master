import { NextResponse } from 'next/server'
import { ZodError, type TypeOf, type ZodTypeAny } from 'zod'
import { audit } from './activity'
import { clientIp, rateLimit, resetRateLimit, type RateLimitResult } from './rate-limit'

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, init)
}

export function fail(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
}

export function validationError(error: ZodError): NextResponse {
  const first = error.issues[0]
  const path = first?.path?.join('.') || 'entrada'
  return fail(`Campo inválido: ${path}.`, 422, 'validation_error')
}

/** Executa uma rota com tratamento de erro uniforme. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : 'Erro inesperado.'
    console.error('[craftforge:api]', err)
    return fail(message, 500, 'internal_error')
  }
}

/** Aplica rate limit; devolve 429 pronto quando estoura. */
export function guard(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult | null {
  const result = rateLimit(key, limit, windowMs)
  return result.ok ? null : result
}

export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: `Muitas tentativas. Tente de novo em ${result.retryAfterSeconds}s.`,
      code: 'rate_limited',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

/** Limpa o rate limit depois de um login/sucesso. */
export function clearLimit(key: string): void {
  resetRateLimit(key)
}

export async function logAudit(entry: {
  userId?: string | null
  action: string
  detail?: string
  headers: Headers
}): Promise<void> {
  await audit({
    userId: entry.userId ?? null,
    action: entry.action,
    detail: entry.detail ?? '',
    ip: clientIp(entry.headers),
  })
}

/** Faz parse e valida o corpo com zod, traduzindo erros. */
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: TypeOf<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: fail('Corpo da requisição inválido.', 400, 'bad_json') }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, response: validationError(parsed.error) }
  return { ok: true, data: parsed.data }
}
