import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryClient } from '@/components/LibraryClient'

export const metadata: Metadata = {
  title: 'Biblioteca de addons',
  description:
    'Addons, mobs, blocos e mundos de Minecraft Bedrock publicados pela comunidade do CraftForge.',
}
export const dynamic = 'force-dynamic'

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16" />}>
      <LibraryClient />
    </Suspense>
  )
}
