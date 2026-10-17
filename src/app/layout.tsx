import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getCurrentUser } from '@/lib/session'
import { getVersions } from '@/lib/versions'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'CraftForge — Criador de addons, mods e mundos para Minecraft Bedrock',
    template: '%s · CraftForge',
  },
  description:
    'Crie addons, mods, mobs, blocos, itens e mundos para Minecraft Bedrock 1.26.52 direto no navegador. Sem código, com export .mcaddon, conta gratuita e salvamento em tempo real.',
  keywords: [
    'minecraft',
    'addons',
    'minecraft bedrock',
    'criar addon',
    'mcaddon',
    'mods minecraft',
    'behavior pack',
    'resource pack',
    '1.26.52',
  ],
  authors: [{ name: 'CraftForge' }],
  openGraph: {
    title: 'CraftForge — Criador de addons para Minecraft Bedrock',
    description:
      'Crie addons, mobs, blocos e mundos para Minecraft Bedrock 1.26.52 sem escrever uma linha de código. Exporte .mcaddon e abra direto no jogo.',
    type: 'website',
    locale: 'pt_BR',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#07090d',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, versions] = await Promise.all([getCurrentUser(), getVersions()])

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-grass-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader user={user} version={versions.bedrock.id} />
        <main id="conteudo">{children}</main>
      </body>
    </html>
  )
}
