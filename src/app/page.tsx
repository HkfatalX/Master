import Link from 'next/link'
import { CATEGORIES } from '@/lib/minecraft'
import { getVersions } from '@/lib/versions'
import { stats } from '@/lib/store'

export const dynamic = 'force-dynamic'

const STEPS = [
  {
    n: '1',
    title: 'Crie sua conta',
    text: 'E-mail e senha, confirmação por link e sessão segura. Seus projetos ficam salvos no datastore.',
  },
  {
    n: '2',
    title: 'Monte no editor visual',
    text: 'Itens, blocos, mobs, receitas e mundos por formulário. Nada de JSON na mão — mas você vê o JSON gerado.',
  },
  {
    n: '3',
    title: 'Valide e exporte',
    text: 'Validação automática aponta erros antes do export. Baixe o .mcaddon e abra direto no Minecraft.',
  },
]

const FEATURES = [
  {
    icon: '🧱',
    title: 'Itens e blocos de verdade',
    text: 'Componentes reais da 1.26.50: comida, ferramenta, armadura, combustível, luz, fricção, drops e loot tables.',
  },
  {
    icon: '🐉',
    title: 'Mobs com modelo próprio',
    text: 'O CraftForge gera geometria, textura, animações de caminhada e ovo de spawn. IA hostil ou pacífica, domável e montável.',
  },
  {
    icon: '⚡',
    title: 'Salvamento em tempo real',
    text: 'Autosave a cada alteração, histórico de versões e detecção de conflito entre abas. Nada se perde.',
  },
  {
    icon: '🎨',
    title: 'Texturas automáticas',
    text: 'Sem imagem? O CraftForge desenha uma textura determinística em PNG para o pack abrir completo no jogo.',
  },
  {
    icon: '📦',
    title: 'Export .mcaddon pronto',
    text: 'Behavior pack + resource pack com manifests, UUIDs estáveis e min_engine_version correto para 1.26.52.',
  },
  {
    icon: '🌍',
    title: 'Biblioteca da comunidade',
    text: 'Publique, curta, comente e baixe addons de outros criadores. Busca por categoria e ordenação por downloads.',
  },
  {
    icon: '🔒',
    title: 'Segurança de verdade',
    text: 'scrypt, sessões opacas revogáveis, rate limit, checagem de Origin (CSRF), validação zod e SQL parametrizado.',
  },
  {
    icon: '🧭',
    title: 'Sempre na versão mais recente',
    text: 'Alvo padrão em 1.26.52 com suporte a 1.26.50, 1.26.40, 1.26.0 e 1.21.90. Regras de formato atualizadas.',
  },
]

const FAQ = [
  {
    q: 'Preciso saber programar?',
    a: 'Não. Você preenche formulários e o CraftForge escreve todo o JSON do addon. Se quiser, dá para inspecionar cada arquivo gerado na aba "Arquivos".',
  },
  {
    q: 'Funciona em qual versão do Minecraft?',
    a: 'O alvo padrão é o Bedrock mais recente, e você ainda pode mirar 1.26.50, 1.26.40, 1.26.0 ou 1.21.90 no editor. Quando o Minecraft lança uma versão nova, o CraftForge atualiza sem você precisar fazer nada.',
  },
  {
    q: 'É oficial da Mojang/Microsoft?',
    a: 'Não. O CraftForge é uma ferramenta independente de terceiros, sem vínculo com Mojang ou Microsoft. Minecraft é marca registrada da Mojang AB.',
  },
  {
    q: 'Meus projetos ficam privados?',
    a: 'Sim, todo projeto nasce privado. Você escolhe publicar na biblioteca quando quiser — e só depois de confirmar o e-mail.',
  },
  {
    q: 'Preciso instalar alguma coisa?',
    a: 'Nada. Roda no navegador. O único arquivo que vai para o seu computador é o .mcaddon final, que abre direto no Minecraft Bedrock.',
  },
]

export default async function HomePage() {
  const [numbers, versions] = await Promise.all([stats(), getVersions()])
  const DEFAULT_TARGET_VERSION = versions.bedrock.id

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.55]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-grass-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-ember-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-grass-500/20 px-2 py-0.5 font-semibold text-grass-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-grass-400" />
                  {versions.bedrock.label}
                </span>
                <span className="text-slate-400">
                  Atualizado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}
                </span>
              </div>

              <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Crie addons de{' '}
                <span className="bg-gradient-to-r from-grass-400 via-grass-300 to-ember-400 bg-clip-text text-transparent">
                  Minecraft
                </span>{' '}
                sem escrever uma linha de código
              </h1>

              <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-slate-400">
                Mobs, armas, blocos, itens, texturas e mundos para <strong className="text-slate-200">Minecraft Bedrock {DEFAULT_TARGET_VERSION}</strong> —
                com export <code className="kbd">.mcaddon</code>, conta gratuita, autosave em tempo real e
                validação que pega o erro antes do jogo pegar.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/criar-conta" className="btn-primary px-6 py-3 text-base">
                  Começar a criar — é grátis
                </Link>
                <Link href="/biblioteca" className="btn-secondary px-6 py-3 text-base">
                  Ver biblioteca
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { label: 'Addons criados', value: numbers.projects },
                  { label: 'Publicados', value: numbers.published },
                  { label: 'Downloads', value: numbers.downloads },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</dt>
                    <dd className="mt-0.5 text-2xl font-black text-white">
                      {item.value.toLocaleString('pt-BR')}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 text-xs text-slate-500">
                Ferramenta independente, sem vínculo com Mojang ou Microsoft. Minecraft é marca da Mojang AB.
              </p>
            </div>

            {/* Preview do editor */}
            <div className="relative">
              <div className="animate-bob">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 shadow-2xl shadow-black/50 backdrop-blur">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.07] bg-ink-850/80 px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-500/70" />
                    <span className="h-3 w-3 rounded-full bg-ember-500/70" />
                    <span className="h-3 w-3 rounded-full bg-grass-500/70" />
                    <span className="ml-3 font-mono text-xs text-slate-500">
                      meu_addon_BP/items/espada_de_rubi.json
                    </span>
                  </div>
                  <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-slate-300">
{`{
  "format_version": "1.26.50",
  "minecraft:item": {
    "description": {
      "identifier": "forge:espada_de_rubi",
      "menu_category": { "category": "equipment" }
    },
    "components": {
      "minecraft:icon": { "texture": "espada_de_rubi" },
      "minecraft:hand_equipped": true,
      "minecraft:damage": 9,
      "minecraft:durability": { "max_durability": 1561 },
      "minecraft:enchantable": { "slot": "sword", "value": 14 },
      "minecraft:weapon": {}
    }
  }
}`}
                  </pre>
                  <div className="flex items-center justify-between border-t border-white/[0.07] bg-ink-850/60 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-grass-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-grass-400" />
                      Validado · 0 erros
                    </span>
                    <span className="rounded-md bg-grass-500 px-2.5 py-1 text-xs font-bold text-ink-950">
                      Baixar .mcaddon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Versões ---------------- */}
      <section className="border-y border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                tag: 'Estável · Bedrock',
                title: versions.bedrock.label,
                meta: versions.bedrock.releasedAt,
                note: versions.bedrock.notes,
                accent: 'grass' as const,
              },
              {
                tag: 'Estável · Java',
                title: versions.java.label,
                meta: versions.java.releasedAt,
                note: versions.java.notes,
                accent: 'ember' as const,
              },
              {
                tag: 'Preview · Bedrock',
                title: versions.preview.label,
                meta: versions.preview.releasedAt,
                note: versions.preview.notes,
                accent: 'slate' as const,
              },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={`chip ${
                      item.accent === 'grass'
                        ? 'border-grass-500/30 bg-grass-500/10 text-grass-300'
                        : item.accent === 'ember'
                          ? 'border-ember-500/30 bg-ember-500/10 text-ember-400'
                          : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {item.tag}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(item.meta))}
                  </span>
                </div>
                <p className="mt-3 text-lg font-bold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Recursos ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Tudo que você precisa, nada que você não precisa
          </h2>
          <p className="mt-4 text-balance text-slate-400">
            Focado em Minecraft Bedrock e mantido sempre na versão mais recente do jogo.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card card-hover p-5">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 font-bold text-white">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Categorias ---------------- */}
      <section className="border-y border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-tight text-white">
            O que dá para criar
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {CATEGORIES.map((category) => (
              <span
                key={category.id}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-grass-500/40 hover:text-white"
                title={category.blurb}
              >
                <span>{category.emoji}</span>
                {category.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Como funciona ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-black tracking-tight text-white">
          Três passos e está no jogo
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card relative p-6">
              <span className="absolute -top-4 left-6 grid h-9 w-9 place-items-center rounded-xl bg-grass-500 text-base font-black text-ink-950 shadow-lg shadow-grass-500/30">
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="border-t border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-tight text-white">
            Perguntas frequentes
          </h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-white">
                  {item.q}
                  <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-grass-500/20 bg-gradient-to-br from-grass-600/20 via-ink-850 to-ink-900 p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-grass-500/20 blur-3xl" />
          <h2 className="relative text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Seu próximo addon começa agora
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-balance text-slate-300">
            Conta gratuita, projetos ilimitados até 50 e export .mcaddon pronto para o Minecraft Bedrock {DEFAULT_TARGET_VERSION}.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/criar-conta" className="btn-primary px-7 py-3 text-base">
              Criar minha conta
            </Link>
            <Link href="/entrar" className="btn-secondary px-7 py-3 text-base">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-ink-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-grass-400 to-grass-600 font-black text-ink-950">
              ⛏
            </span>
            <span className="font-extrabold text-white">
              Craft<span className="text-grass-400">Forge</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Ferramenta independente de fãs. Não é afiliada à Mojang ou Microsoft. Minecraft é marca da Mojang AB.
          </p>
          <nav className="flex gap-4 text-sm text-slate-400">
            <Link href="/biblioteca" className="hover:text-white">Biblioteca</Link>
            <Link href="/painel" className="hover:text-white">Projetos</Link>
            <Link href="/api/health" className="hover:text-white">Status</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
