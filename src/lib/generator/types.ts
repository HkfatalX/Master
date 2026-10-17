import {
  DEFAULT_TARGET_VERSION,
  slugifyName,
  slugifyNamespace,
} from '../minecraft'

export type Id = string

export type ProjectMeta = {
  name: string
  description: string
  namespace: string
  author: string
  targetVersion: string
  version: [number, number, number]
  packIcon: string | null
}

export type ItemShape = 'auto' | 'gem' | 'ingot' | 'sword' | 'orb' | 'food' | 'tool' | 'disc' | 'plant'
export type ToolType = 'none' | 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'sword'
export type ArmorSlot = 'none' | 'head' | 'chest' | 'legs' | 'feet'

export type ItemDef = {
  id: Id
  key: string
  displayName: string
  category: string
  group: string
  maxStackSize: number
  handEquipped: boolean
  texture: string | null
  color: string | null
  shape: ItemShape
  food: boolean
  nutrition: number
  saturation: number
  canAlwaysEat: boolean
  tool: boolean
  toolType: ToolType
  tier: number
  damage: number
  durability: number
  efficiency: number
  armor: boolean
  armorSlot: ArmorSlot
  protection: number
  fuel: boolean
  burnSeconds: number
  compostable: boolean
  compostChance: number
  throwable: boolean
  cooldown: number
}

export type BlockDef = {
  id: Id
  key: string
  displayName: string
  category: string
  group: string
  texture: string | null
  color: string | null
  hardness: number
  resistance: number
  lightEmission: number
  lightDampening: number
  friction: number
  height: 4 | 8 | 16
  flammable: boolean
  burnOdds: number
  flameOdds: number
  sound: string
  dropsSelf: boolean
  dropItem: string | null
  dropMin: number
  dropMax: number
  mapColor: string | null
}

export type EntityDrop = {
  id: Id
  item: string
  min: number
  max: number
  chance: number
}

export type EntityDef = {
  id: Id
  key: string
  displayName: string
  texture: string | null
  color: string | null
  health: number
  damage: number
  speed: number
  followRange: number
  knockbackResistance: number
  width: number
  height: number
  isHostile: boolean
  isTameable: boolean
  isAquatic: boolean
  isFireImmune: boolean
  isRideable: boolean
  spawnEgg: boolean
  eggBase: string
  eggOverlay: string
  drops: EntityDrop[]
}

export type RecipeType = 'shaped' | 'shapeless' | 'furnace'

export type RecipeDef = {
  id: Id
  key: string
  type: RecipeType
  pattern: [string, string, string]
  keyMap: Record<string, string>
  ingredients: string[]
  result: string
  resultCount: number
  tags: string[]
  experience: number
}

export type WorldSettings = {
  seed: string
  gamemode: 'survival' | 'creative' | 'adventure'
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard'
  pvp: boolean
  cheats: boolean
  generateStructures: boolean
  simulationDistance: number
  keepInventory: boolean
}

export type ProjectData = {
  meta: ProjectMeta
  items: ItemDef[]
  blocks: BlockDef[]
  entities: EntityDef[]
  recipes: RecipeDef[]
  world: WorldSettings
}

export function newId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export function emptyWorld(): WorldSettings {
  return {
    seed: '',
    gamemode: 'survival',
    difficulty: 'normal',
    pvp: true,
    cheats: false,
    generateStructures: true,
    simulationDistance: 4,
    keepInventory: false,
  }
}

export function emptyProject(name = 'Meu Addon', namespace = 'forge'): ProjectData {
  return {
    meta: {
      name,
      description: 'Feito no CraftForge — abra direto no Minecraft Bedrock.',
      namespace: slugifyNamespace(namespace),
      author: '',
      targetVersion: DEFAULT_TARGET_VERSION,
      version: [1, 0, 0],
      packIcon: null,
    },
    items: [],
    blocks: [],
    entities: [],
    recipes: [],
    world: emptyWorld(),
  }
}

/** Projeto de exemplo usado no "começar do zero" do dashboard. */
export function starterProject(name = 'Meu Addon', namespace = 'forge'): ProjectData {
  const data = emptyProject(name, namespace)
  const ns = slugifyNamespace(namespace)

  data.items.push({
    ...emptyItem('rubi', ns),
    displayName: 'Rubi',
    color: '#e0453f',
    shape: 'gem',
    maxStackSize: 64,
  })
  data.blocks.push({
    ...emptyBlock('bloco_de_rubi', ns),
    displayName: 'Bloco de Rubi',
    color: '#c23a35',
    hardness: 1.2,
    sound: 'stone',
  })
  data.recipes.push({
    ...emptyRecipe('bloco_de_rubi', ns),
    type: 'shapeless',
    ingredients: [`${ns}:rubi`, `${ns}:rubi`, `${ns}:rubi`, `${ns}:rubi`],
    result: `${ns}:bloco_de_rubi`,
    resultCount: 1,
    tags: ['crafting_table'],
  })
  return data
}

export function emptyItem(key = 'item', ns = 'forge'): ItemDef {
  return {
    id: newId(),
    key: slugifyName(key),
    displayName: 'Item Novo',
    category: 'items',
    group: '',
    maxStackSize: 64,
    handEquipped: false,
    texture: null,
    color: null,
    shape: 'auto',
    food: false,
    nutrition: 4,
    saturation: 0.6,
    canAlwaysEat: false,
    tool: false,
    toolType: 'none',
    tier: 2,
    damage: 3,
    durability: 200,
    efficiency: 6,
    armor: false,
    armorSlot: 'chest',
    protection: 5,
    fuel: false,
    burnSeconds: 160,
    compostable: false,
    compostChance: 30,
    throwable: false,
    cooldown: 0,
  }
}

export function emptyBlock(key = 'bloco', ns = 'forge'): BlockDef {
  return {
    id: newId(),
    key: slugifyName(key),
    displayName: 'Bloco Novo',
    category: 'construction',
    group: '',
    texture: null,
    color: null,
    hardness: 1.5,
    resistance: 6,
    lightEmission: 0,
    lightDampening: 0,
    friction: 0.6,
    height: 16,
    flammable: false,
    burnOdds: 5,
    flameOdds: 20,
    sound: 'stone',
    dropsSelf: true,
    dropItem: null,
    dropMin: 1,
    dropMax: 1,
    mapColor: null,
  }
}

export function emptyEntity(key = 'criatura', ns = 'forge'): EntityDef {
  return {
    id: newId(),
    key: slugifyName(key),
    displayName: 'Criatura Nova',
    texture: null,
    color: null,
    health: 20,
    damage: 3,
    speed: 0.25,
    followRange: 16,
    knockbackResistance: 0,
    width: 0.8,
    height: 1.8,
    isHostile: false,
    isTameable: false,
    isAquatic: false,
    isFireImmune: false,
    isRideable: false,
    spawnEgg: true,
    eggBase: '#3fc95c',
    eggOverlay: '#1f8234',
    drops: [],
  }
}

export function emptyRecipe(key = 'receita', ns = 'forge'): RecipeDef {
  return {
    id: newId(),
    key: slugifyName(key),
    type: 'shaped',
    pattern: ['###', '###', '###'],
    keyMap: { '#': 'minecraft:diamond' },
    ingredients: ['minecraft:diamond'],
    result: `${slugifyNamespace(ns)}:item`,
    resultCount: 1,
    tags: ['crafting_table'],
    experience: 0,
  }
}

/** Namespace efetivo (sempre válido) a partir do meta. */
export function ns(meta: ProjectMeta): string {
  return slugifyNamespace(meta.namespace)
}

export function itemIdentifier(item: ItemDef, meta: ProjectMeta): string {
  return `${ns(meta)}:${slugifyName(item.key)}`
}

export function blockIdentifier(block: BlockDef, meta: ProjectMeta): string {
  return `${ns(meta)}:${slugifyName(block.key)}`
}

export function entityIdentifier(entity: EntityDef, meta: ProjectMeta): string {
  return `${ns(meta)}:${slugifyName(entity.key)}`
}
