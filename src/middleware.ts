import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proteção CSRF em nível de borda.
 *
 * O cookie de sessão é `SameSite=Lax`, o que já bloqueia a maioria dos ataques
 * cross-site. Aqui adicionamos a checagem de `Origin` em toda requisição que
 * altera estado: se o navegador não está no mesmo host (ou em um host
 * explicitamente liberado em ALLOWED_ORIGINS), a chamada é recusada.
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Páginas que exigem sessão. O middleware só checa a presença do cookie
 * (a validação real acontece no servidor, na página) — é um atalho de UX que
 * responde 307 de verdade em vez de redirecionar depois do streaming.
 */
const PROTECTED = ['/painel', '/perfil', '/editor', '/admin', '/caixa-de-entrada']

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    request.method === 'GET' &&
    PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    const hasSession = Boolean(request.cookies.get('cf_session')?.value)
    if (!hasSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/entrar'
      url.search = `?next=${encodeURIComponent(pathname)}`
      return NextResponse.redirect(url, 307)
    }
  }

  if (!MUTATING.has(request.method)) return NextResponse.next()

  const origin = request.headers.get('origin')
  // Sem Origin (curl, server-to-server, formulário nativo) aceitamos:
  // a proteção restante vem de SameSite=Lax + token opaco.
  if (!origin) return NextResponse.next()

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return NextResponse.json({ error: 'Origem inválida.', code: 'bad_origin' }, { status: 403 })
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host && originHost === host) return NextResponse.next()

  const extra = allowedOrigins()
  if (extra.length) {
    for (const entry of extra) {
      let candidate = entry
      try {
        candidate = new URL(entry).host
      } catch {
        /* mantém como está */
      }
      if (candidate === originHost) return NextResponse.next()
    }
  }

  return NextResponse.json(
    { error: 'Origem não permitida.', code: 'csrf_blocked' },
    { status: 403 },
  )
}

export const config = {
  matcher: ['/api/:path*', '/painel/:path*', '/painel', '/perfil', '/editor/:path*', '/admin', '/caixa-de-entrada'],
}
