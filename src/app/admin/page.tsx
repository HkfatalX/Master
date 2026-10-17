import type { Metadata } from 'next'
import Link from 'next/link'

import { AdminPanel } from '@/components/AdminPanel'
import { getVersions, type Versions } from '@/lib/versions'
import { stats } from '@/lib/store'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Administração' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-white">Acesso restrito</h1>
        <p className="mt-2 text-slate-400">Entre com uma conta de administrador.</p>
        <Link href="/entrar?next=/admin" className="btn-primary mt-6">
          Entrar
        </Link>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-2xl font-black text-white">Sem permissão</h1>
        <p className="mt-2 text-slate-400">
          Sua conta ({user.email}) não tem papel de administrador.
          <br />
          Defina <code className="kbd">CRAFTFORGE_ADMIN_EMAIL</code> antes de criar a conta para
          liberar este painel.
        </p>
        <Link href="/painel" className="btn-secondary mt-6">
          Voltar aos projetos
        </Link>
      </div>
    )
  }

  const [versions, numbers] = await Promise.all([getVersions(), stats()])
  return <AdminPanel initial={versions} stats={numbers} />
}
