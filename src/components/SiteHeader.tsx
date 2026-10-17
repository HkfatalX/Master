'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { SessionUser } from '@/lib/session'
import { api, initials } from '@/lib/client'
import { DEFAULT_TARGET_VERSION } from '@/lib/minecraft'

const LINKS = [
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/painel', label: 'Meus projetos' },
]

export function SiteHeader({ user, version = DEFAULT_TARGET_VERSION }: { user: SessionUser | null; version?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [pathname])

  useEffect(() => {
    if (!menu) return
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menu])

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      /* segue mesmo assim: limpa o estado local */
    }
    setMenu(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="CraftForge — início">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-grass-400 to-grass-600 text-lg font-black text-ink-950 shadow-lg shadow-grass-500/25 transition-transform group-hover:scale-105">
            ⛏
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Craft<span className="text-grass-400">Forge</span>
          </span>
        </Link>

        <span
          className="chip ml-1 hidden shrink-0 border-grass-500/30 bg-grass-500/10 font-mono text-[11px] text-grass-300 sm:inline-flex"
          title={`Versão estável mais recente do Minecraft Bedrock: ${version}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-grass-400" />
          MC {version}
        </span>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-white/20"
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-ink-950"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {initials(user.displayName || user.username)}
                </span>
                <span className="hidden text-sm font-medium text-slate-200 sm:block">
                  {user.username}
                </span>
                <span className="text-slate-500">▾</span>
              </button>

              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl"
                >
                  <div className="border-b border-white/5 px-3 pb-2.5 pt-2">
                    <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    {!user.emailVerified && (
                      <Link
                        href="/verificar"
                        className="mt-2 inline-block rounded-md bg-ember-500/15 px-2 py-1 text-[11px] font-semibold text-ember-400 hover:bg-ember-500/25"
                      >
                        Confirmar e-mail
                      </Link>
                    )}
                  </div>
                  <MenuItem href="/painel" label="Meus projetos" icon="📁" />
                  <MenuItem href="/perfil" label="Minha conta" icon="⚙️" />
                  <MenuItem href="/caixa-de-entrada" label="Caixa de entrada" icon="📬" />
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <span>🚪</span> Sair da conta
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/entrar" className="btn-ghost hidden sm:inline-flex">
                Entrar
              </Link>
              <Link href="/criar-conta" className="btn-primary">
                Criar conta grátis
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 md:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-ink-900 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/entrar"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
    >
      <span>{icon}</span>
      {label}
    </Link>
  )
}
