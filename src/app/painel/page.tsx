import type { Metadata } from 'next'
import { Dashboard } from '@/components/Dashboard'
import { listUserProjects } from '@/lib/store'
import { countUserProjects, FREE_PROJECT_LIMIT } from '@/lib/session'
import { requireUserPage } from '@/lib/session'

export const metadata: Metadata = { title: 'Meus projetos' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUserPage('/entrar?next=/painel')
  const [projects, used] = await Promise.all([listUserProjects(user.id), countUserProjects(user.id)])

  return <Dashboard user={user} projects={projects} used={used} limit={FREE_PROJECT_LIMIT} />
}
