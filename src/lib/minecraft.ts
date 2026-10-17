/**
 * Fonte única de verdade para versões do Minecraft e formatos de addon.
 * Atualizado em: 17 de outubro de 2026.
 *
 * Bedrock estável mais recente: 26.52 (1.26.52) — hotfix de 25/09/2026.
 * Java estável mais recente: 26.3 — 15/09/2026.
 * Bedrock Preview/Beta mais recente: 26.60.28 — 22/09/2026.
 *
 * Referências:
 * - https://minecraft.wiki/w/Bedrock_Edition_26.52
 * - https://wiki.bedrock.dev/items/item-components
 */

export type PackFormat = 'mcaddon' | 'mcpack' | 'zip'

export const MINECRAFT_VERSIONS = {
  /** Edição Bedrock — alvo principal do CraftForge */
  bedrock: {
    id: '1.26.52',
    release: '26.52',
    label: 'Bedrock 1.26.52',
    releasedAt: '2026-09-25',
    kind: 'stable' as const,
    notes: 'Hotfix do Wilderness Bound (26.50). Corrige projéteis em Spectator, almofadas, conquistas e itens invisíveis.',
  },
  /** Edição Java — usada apenas como referência/catálogo */
  java: {
    id: '26.3',
    release: '26.3',
    label: 'Java 26.3',
    releasedAt: '2026-09-15',
    kind: 'stable' as const,
    notes: 'Wilderness Bound — mesma linha de atualização do Bedrock 26.50.',
  },
  /** Bedrock Preview / Beta (instável — conteúdo experimental) */
  preview: {
    id: '1.26.60.28',
    release: '26.60.28',
    label: 'Bedrock Preview 26.60.28',
    releasedAt: '2026-09-22',
    kind: 'preview' as const,
    notes: 'Próximo drop (26.60). Não use em addons publicados.',
  },
} as const

/** Versão alvo padrão de todos os projetos novos. */
export const DEFAULT_TARGET_VERSION: string = MINECRAFT_VERSIONS.bedrock.id

/** Versões aceitas pelo seletor de alvo do editor. */
export const TARGET_VERSIONS = [
  { id: '1.26.52', label: '1.26.52', engine: [1, 26, 52], recommended: true, stable: true },
  { id: '1.26.50', label: '1.26.50', engine: [1, 26, 50], recommended: false, stable: true },
  { id: '1.26.40', label: '1.26.40', engine: [1, 26, 40], recommended: false, stable: true },
  { id: '1.26.0', label: '1.26.0', engine: [1, 26, 0], recommended: false, stable: true },
  { id: '1.21.90', label: '1.21.90', engine: [1, 21, 90], recommended: false, stable: true },
] as const

/**
 * `format_version` usado dentro de cada arquivo JSON gerado.
 * Itens e blocos seguem a 1.26.50 (mais recente documentada).
 * IMPORTANTE: itens com format_version >= 1.26.30 exigem ao menos um componente
 * em `minecraft:item.components`, senão o registro falha (content error).
 */
export const FORMAT_VERSIONS = {
  item: '1.26.50',
  block: '1.26.50',
  entity: '1.26.40',
  clientEntity: '1.10.0',
  recipe: '1.26.50',
  lootTable: '1.26.50',
  geometry: '1.21.0',
  itemTexture: '1.16.100',
  manifest: 2,
} as const

/** Converte "1.26.52" no array `min_engine_version` do manifest. */
export function engineVersion(target: string): [number, number, number] {
  const found = TARGET_VERSIONS.find((v) => v.id === target)
  if (found) return [...found.engine] as [number, number, number]
  const parts = target.split('.').map((p) => Number.parseInt(p, 10) || 0)
  return [parts[0] ?? 1, parts[1] ?? 0, parts[2] ?? 0]
}

export const CATEGORIES = [
  { id: 'mobs', label: 'Mobs', emoji: '🐉', blurb: 'Criaturas com IA, drops e modelos.' },
  { id: 'weapons', label: 'Armas', emoji: '⚔️', blurb: 'Espadas, arcos e projéteis.' },
  { id: 'items', label: 'Itens', emoji: '🍎', blurb: 'Comidas, ferramentas e utilitários.' },
  { id: 'blocks', label: 'Blocos', emoji: '🧱', blurb: 'Blocos de construção e funcionais.' },
  { id: 'furniture', label: 'Móveis', emoji: '🛋️', blurb: 'Decoração para sua casa.' },
  { id: 'vehicles', label: 'Veículos', emoji: '🚗', blurb: 'Carros, barcos e afins.' },
  { id: 'textures', label: 'Texturas', emoji: '🎨', blurb: 'Pacotes de recursos e repaint.' },
  { id: 'maps', label: 'Mapas', emoji: '🗺️', blurb: 'Mundos e aventuras prontas.' },
  { id: 'skins', label: 'Skins', emoji: '🧑', blurb: 'Skins e pacotes de personagem.' },
  { id: 'worlds', label: 'Mundos', emoji: '🌍', blurb: 'Geração de mundo personalizada.' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

/** Categorias do menu criativo aceitas por `menu_category.category`. */
export const CREATIVE_CATEGORIES = [
  'construction',
  'nature',
  'equipment',
  'items',
  'commands',
  'none',
] as const

/** Namespace reservado — nunca pode ser usado por conteúdo custom. */
export const RESERVED_NAMESPACES = new Set(['minecraft', 'minecon', 'mojang', 'microsoft'])

/** Regex de identificador válido: `namespace:nome` com [a-z0-9_.-] */
export const IDENTIFIER_RE = /^[a-z0-9_.\-]+:[a-z0-9_.\-/]+$/

/** Converte texto livre em um namespace seguro para packs. */
export function slugifyNamespace(input: string, fallback = 'forge'): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16)
  if (!base) return fallback
  if (/^[0-9]/.test(base)) return `${fallback}_${base}`.slice(0, 16)
  return RESERVED_NAMESPACES.has(base) ? `${base}_x` : base
}

/** Normaliza a parte "nome" de um identificador. */
export function slugifyName(input: string, fallback = 'item'): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  if (!base) return fallback
  return /^[0-9]/.test(base) ? `${fallback}_${base}` : base
}

/** Cria um identificador completo e válido a partir de namespace + nome. */
export function makeIdentifier(namespace: string, name: string): string {
  return `${slugifyNamespace(namespace)}:${slugifyName(name)}`
}

/** Shortname usado em `item_texture.json` (sem namespace). */
export function shortName(identifier: string): string {
  return identifier.includes(':') ? identifier.split(':').slice(1).join(':') : identifier
}
