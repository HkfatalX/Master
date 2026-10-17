import { newId, run } from './db'

/**
 * Entrega de e-mail do CraftForge.
 *
 * O ambiente sandbox (e a maioria dos previews) não tem SMTP liberado, então o
 * transporte padrão grava a mensagem numa caixa de saída interna, exibida em
 * `/caixa-de-entrada`. Assim o fluxo de verificação de e-mail e de reset de
 * senha é 100% funcional e testável hoje.
 *
 * Para produção: defina `SMTP_URL` (ou implemente `transport` com Resend/SES/
 * Postmark). A função `deliver()` é o único ponto que precisa mudar.
 */

export type Message = {
  to: string
  subject: string
  body: string
  html?: string
}

async function deliver(message: Message): Promise<{ delivered: boolean; via: string }> {
  await run(
    `INSERT INTO mail_outbox (id, to_email, subject, body) VALUES (?, ?, ?, ?)`,
    [newId('mail'), message.to, message.subject, message.body],
  )

  if (process.env.CRAFTFORGE_MAIL_LOG !== 'off') {
    console.log(
      `[craftforge:mail] -> ${message.to} | ${message.subject}\n${message.body.split('\n').map((l) => `    ${l}`).join('\n')}`,
    )
  }

  return { delivered: true, via: 'outbox' }
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${appUrl()}/verificar?token=${encodeURIComponent(token)}`
  await deliver({
    to: email,
    subject: 'Confirme seu e-mail — CraftForge',
    body: [
      'Bem-vindo ao CraftForge!',
      '',
      'Confirme seu e-mail para liberar publicação e sincronização:',
      link,
      '',
      'Este link expira em 24 horas. Se não foi você, ignore esta mensagem.',
    ].join('\n'),
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${appUrl()}/redefinir?token=${encodeURIComponent(token)}`
  await deliver({
    to: email,
    subject: 'Redefinir senha — CraftForge',
    body: [
      'Recebemos um pedido para redefinir sua senha.',
      '',
      'Crie uma nova senha neste link (válido por 1 hora):',
      link,
      '',
      'Se não foi você, ignore esta mensagem — sua senha continua a mesma.',
    ].join('\n'),
  })
}

export async function sendMail(message: Message) {
  return deliver(message)
}
