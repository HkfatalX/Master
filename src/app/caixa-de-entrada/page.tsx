import type { Metadata } from 'next'
import Link from 'next/link'

import { MailInbox } from '@/components/MailInbox'
import { listMail } from '@/lib/store'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Caixa de entrada' }
export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const user = await getCurrentUser()
  const messages = user ? await listMail(30) : []

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-white">Entre para ver suas mensagens</h1>
        <Link href="/entrar?next=/caixa-de-entrada" className="btn-primary mt-6">
          Entrar
        </Link>
      </div>
    )
  }

  return <MailInbox messages={messages} />
}
