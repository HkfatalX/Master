import Link from 'next/link'
import { CATEGORIES } from '@/lib/minecraft'
import { getVersions } from '@/lib/versions'
import { stats } from '@/lib/store'

export const dynamic = 'force-dynamic'

const STEPS = [
  {
    n: '1',
    title: 'Crie sua conta',
    text: 'Entre em segundos e comece a salvar seus projetos no painel do editor.',
  },
  {
    n: '2',
    title: 'Monte no editor visual',
    text: 'Configure mobs, itens, blocos, receitas e recursos por formulários intuitivos.',
  },
  {
    n: '3',
    title: 'Valide e exporte',
    text: 'Validação automática, preview e download do .mcaddon em poucos cliques.',
  },
]

const FEATURES = [
  {
    icon: '🧱',
    title: 'Itens e blocos profissionais',
    text: 'Crie itens com durabilidade, dano, raridade, drops, loot e visual único.',
  },
  {
    icon: '🐉',
    title: 'Mobs com identidade',
    text: 'Defina vida, ataque, comportamento, modelo visual e textura em um editor guiado.',
  },
  {
    icon: '⚡',
    title: 'Autosave inteligente',
    text: 'Tudo que você altera fica salvo em tempo real, com versões e recuperação rápida.',
  },
  {
    icon: '🎨',
    title: 'Texturas e skins prontas',
    text: 'Gere e personalize texturas, ícones e recursos visuais sem complicação.',
  },
  {
    icon: '📦',
    title: 'Export .mcaddon limpo',
    text: 'Empacote behavior pack e resource pack com manifest correto para Bedrock.',
  },
  {
    icon: '🌍',
    title: 'Biblioteca da comunidade',
    text: 'Publique, navegue e reutilize addons criados por outros usuários.',
  },
  {
    icon: '🔒',
    title: 'Segurança e organização',
    text: 'Sessões seguras, validação, proteção de acesso e organização por projeto.',
  },
  {
    icon: '🧭',
    title: 'Atualizações constantes',
    text: 'Compatibilidade com versões recentes do Bedrock e suporte para mercados ativos.',
  },
]

const TEMPLATES = [
  {
    title: 'Item épico',
    desc: 'Espada, armadura, consumível ou ferramenta com status e raridade.',
    tag: 'RPG',
    accent: 'grass',
  },
  {
    title: 'Mob hostil',
    desc: 'Criaturas com ataque, drops, comportamento e textura própria.',
    tag: 'Aventura',
    accent: 'ember',
  },
  {
    title: 'Bloco de missão',
    desc: 'Blocos interativos, raros e com funções especiais em mapas personalizados.',
    tag: 'Mapas',
    accent: 'slate',
  },
  {
    title: 'Mundo survival',
    desc: 'Estruturas e recursos para dar vida a um mundo totalmente novo.',
    tag: 'Survival',
    accent: 'grass',
  },
]

const PLANS = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    description: 'Para testar e criar seus primeiros projetos.',
    features: ['Até 5 projetos ativos', 'Export básico', 'Salvamento local', 'Biblioteca limitada'],
    featured: false,
  },
  {
    name: 'Criador',
    price: 'R$ 19',
    description: 'Para quem quer desenvolver com velocidade e liberdade.',
    features: ['Projetos ilimitados', 'Versões por projeto', 'Export premium', 'Biblioteca de templates'],
    featured: true,
  },
  {
    name: 'Studio',
    price: 'R$ 49',
    description: 'Para equipes, creators e comunidades maiores.',
    features: ['Workspaces em equipe', 'Compartilhamento avançado', 'APIs e automações', 'Suporte prioritário'],
    featured: false,
  },
]

const REVIEWS = [
  {
    name: 'Bruno M.',
    role: 'Mapmaker',
    text: 'O editor me poupou horas. Consegui criar itens e mobs sem ficar quebrando JSON o tempo inteiro.',
  },
  {
    name: 'Luna K.',
    role: 'Criadora de addons',
    text: 'A experiência foi muito melhor do que os editores que já usei. Salvar e exportar em momentos rápidos virou rotina.',
  },
  {
    name: 'Tales S.',
    role: 'Community manager',
    text: 'Usamos a biblioteca para compartilhar recursos e a organização do painel foi essencial para o nosso fluxo.',
  },
]

const FAQ = [
  {
    q: 'Preciso saber programar?',
    a: 'Não. O editor guiado gera as estruturas necessárias para você montar mobs, itens e blocos sem escrever manualmente cada JSON.',
  },
  {
    q: 'Funciona em celular e tablet?',
    a: 'Sim. A interface foi pensada para uso em devices móveis, com navegação simples, botões grandes e layouts responsivos.',
  },
  {
    q: 'Os projetos ficam salvos?',
    a: 'Sim. Seus projetos ficam armazenados com salvamento em tempo real e histórico de versões para evitar perda de progresso.',
  },
  {
    q: 'Posso exportar o addon pronto?',
    a: 'Sim. Você pode validar, ajustar e baixar o pacote .mcaddon final em poucos passos.',
  },
]

export default async function HomePage() {
  const [numbers, versions] = await Promise.all([stats(), getVersions()])
  const DEFAULT_TARGET_VERSION = versions.bedrock.id

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-grass-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-ember-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-grass-500/20 px-2 py-0.5 font-semibold text-grass-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-grass-400" />
                  {versions.bedrock.label}
                </span>
                <span className="text-slate-400">Atualizado para criação em tempo real</span>
              </div>

              <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Crie addons incríveis para Minecraft sem perder tempo.
              </h1>

              <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-slate-400">
                Construa mobs, itens, blocos, recursos e mundos em uma plataforma moderna, com autosave,
                export profissional e biblioteca para compartilhar ideias.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/criar-conta" className="btn-primary px-6 py-3 text-base">
                  Começar agora
                </Link>
                <Link href="/biblioteca" className="btn-secondary px-6 py-3 text-base">
                  Ver biblioteca
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { label: 'Projetos', value: numbers.projects },
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
            </div>

            <div className="relative">
              <div className="animate-bob">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/80 shadow-2xl shadow-black/50 backdrop-blur">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.07] bg-ink-850/80 px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-500/70" />
                    <span className="h-3 w-3 rounded-full bg-ember-500/70" />
                    <span className="h-3 w-3 rounded-full bg-grass-500/70" />
                    <span className="ml-3 font-mono text-xs text-slate-500">meu_projeto/addons/item_epico.json</span>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Projeto ativo</p>
                        <p className="mt-1 text-lg font-bold text-white">Rubi Blade</p>
                      </div>
                      <span className="rounded-full bg-grass-500/15 px-3 py-1 text-xs font-semibold text-grass-300">
                        salvo
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-3">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>Item</span>
                          <span className="text-grass-300">9/10</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/5">
                          <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-grass-400 to-emerald-300" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Dano</p>
                          <p className="mt-2 text-2xl font-black text-white">12</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Raridade</p>
                          <p className="mt-2 text-2xl font-black text-ember-300">Épico</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.07] bg-ink-850/60 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-grass-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-grass-400" />
                      Validado · 0 erros
                    </span>
                    <span className="rounded-lg bg-grass-500 px-2.5 py-1 text-xs font-bold text-ink-950">
                      Exportar .mcaddon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                tag: 'Bedrock',
                title: versions.bedrock.label,
                meta: versions.bedrock.releasedAt,
                note: 'Compatibilidade pronta para criação e publicação.',
                accent: 'grass',
              },
              {
                tag: 'Java',
                title: versions.java.label,
                meta: versions.java.releasedAt,
                note: 'Estrutura para ampliar o universo de mods e packs.',
                accent: 'ember',
              },
              {
                tag: 'Preview',
                title: versions.preview.label,
                meta: versions.preview.releasedAt,
                note: 'Se você gosta de testar novas funcionalidades antes do time.',
                accent: 'slate',
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

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">Tudo em um só lugar</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Mais do que um criador de addons: um hub completo de criação.
          </h2>
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

      <section className="border-y border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">Modelos prontos</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Parta de um template e avance rápido.</h2>
            </div>
            <Link href="/biblioteca" className="btn-secondary inline-flex self-center md:self-auto">
              Explorar biblioteca
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {TEMPLATES.map((template) => (
              <div key={template.title} className="template-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="chip border-white/10 bg-white/[0.03] text-slate-300">{template.tag}</span>
                  <span className="h-3 w-3 rounded-full bg-grass-500" />
                </div>
                <h3 className="text-xl font-bold text-white">{template.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{template.desc}</p>
                <button type="button" className="btn-ghost mt-4 px-0 text-sm text-grass-300">
                  Usar modelo →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">Como funciona</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Três passos e seu addon está em produção.
          </h2>
        </div>

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

      <section className="border-t border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">Planos</p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
              Escolha o plano ideal para seu fluxo.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card p-6 ${plan.featured ? 'ring-2 ring-grass-500/40 shadow-[0_0_0_1px_rgba(74,222,128,0.2)]' : ''}`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-500">/mês</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-200">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-grass-500/15 text-[10px] text-grass-300">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/criar-conta"
                  className={plan.featured ? 'btn-primary mt-6 w-full' : 'btn-secondary mt-6 w-full'}
                >
                  {plan.featured ? 'Escolher Criador' : 'Começar'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">Depoimentos</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Criadores usam a plataforma todos os dias.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <div key={review.name} className="quote-card p-5">
              <div className="mb-4 flex items-center gap-2 text-amber-300">★★★★★</div>
              <p className="text-sm leading-relaxed text-slate-300">“{review.text}”</p>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="font-semibold text-white">{review.name}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{review.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.07] bg-ink-900/40">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-grass-400">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Perguntas frequentes</h2>
          </div>
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

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-grass-500/20 bg-gradient-to-br from-grass-600/20 via-ink-850 to-ink-900 p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-grass-500/20 blur-3xl" />
          <h2 className="relative text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            Seu próximo addon começa agora.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-balance text-slate-300">
            Crie, salve, valide e exporte projetos profissionais para Minecraft Bedrock {DEFAULT_TARGET_VERSION}.
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
            Plataforma independente para criadores de addons, mobs e mundos para Minecraft.
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


