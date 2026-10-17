import type { Metadata } from 'next'
import Link from 'next/link'

import { ProfileClient } from '@/components/ProfileClient'
import { listSessions } from '@/lib/auth'
import { listUserProjects } from '@/lib/store'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Minha conta' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-white">Você precisa entrar</h1>
        <p className="mt-2 text-slate-400">Entre na sua conta para ver e editar seu perfil.</p>
        <Link href="/entrar?next=/perfil" className="btn-primary mt-6">
          Entrar
        </Link>
      </div>
    )
  }

  const sessions = await listSessions(user.id)
  const projects = await listUserProjects(user.id)

  return <ProfileClient user={user} sessions={sessions} projectCount={projects.length} />
}
