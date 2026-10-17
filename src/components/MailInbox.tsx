'use client'

import { useState } from 'react'
import { formatRelative } from '@/lib/client'

type Mail = { id: string; to_email: string; subject: string; body: string; created_at: string }

export function MailInbox({ messages }: { messages: Mail[] }) {
  const [open, setOpen] = useState<string | null>(messages[0]?.id ?? null)
  const current = messages.find((m) => m.id === open) ?? null

  /** Extrai o link do corpo para transformar em botão. */
  function extractLink(body: string): string | null {
    const match = /https?:\/\/[^\s]+/.exec(body)
    return match ? match[0] : null
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-white">📬 Caixa de entrada</h1>
      <p className="mt-1.5 text-sm text-slate-400">
        Confirmações de e-mail e links de redefinição de senha enviados pelo CraftForge.
      </p>

      <div className="mt-4 rounded-xl border border-ember-500/25 bg-ember-500/[0.07] px-4 py-3 text-xs leading-relaxed text-ember-400">
        Este ambiente de preview não tem SMTP liberado, então as mensagens são entregues aqui dentro.
        Em produção, defina <code className="kbd">SMTP_URL</code> (ou troque o transporte em
        <code className="kbd">src/lib/mailer.ts</code>) para enviar de verdade.
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="card max-h-[70vh] overflow-y-auto p-2">
          {messages.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nenhuma mensagem ainda.</p>
          ) : (
            messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => setOpen(message.id)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  open === message.id ? 'bg-grass-500/15' : 'hover:bg-white/5'
                }`}
              >
                <span className="block truncate text-sm font-semibold text-white">{message.subject}</span>
                <span className="block truncate text-[11px] text-slate-500">{message.to_email}</span>
                <span className="block text-[10px] text-slate-600">{formatRelative(message.created_at)}</span>
              </button>
            ))
          )}
        </div>

        <div className="card overflow-hidden">
          {!current ? (
            <p className="p-10 text-center text-sm text-slate-500">Selecione uma mensagem.</p>
          ) : (
            <>
              <div className="border-b border-white/[0.07] px-5 py-4">
                <p className="font-bold text-white">{current.subject}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  para {current.to_email} · {formatRelative(current.created_at)}
                </p>
              </div>
              <pre className="whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-slate-300">
                {current.body}
              </pre>
              {extractLink(current.body) && (
                <div className="border-t border-white/[0.07] px-5 py-4">
                  <a href={extractLink(current.body)!} className="btn-primary">
                    Abrir link da mensagem
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
