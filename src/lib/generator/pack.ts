import crypto from 'node:crypto'
import {
  engineVersion,
  FORMAT_VERSIONS,
  shortName,
  slugifyName,
  slugifyNamespace,
} from '../minecraft'
import { decodeDataImage } from '../png'
import {
  generateBlockTexture,
  generateEntityTexture,
  generateItemTexture,
  generatePackIcon,
} from '../texture'
import { buildBlockGeometry, buildCreatureGeometry } from './geometry'
import {
  blockIdentifier,
  entityIdentifier,
  itemIdentifier,
  ns,
  type BlockDef,
  type EntityDef,
  type ItemDef,
  type ProjectData,
  type RecipeDef,
} from './types'

/**
 * Constrói os arquivos de um addon Minecraft Bedrock a partir do projeto.
 *
 * Alvos suportados: 1.26.52 (padrão), 1.26.50, 1.26.40, 1.26.0, 1.21.90.
 * Todos os UUIDs são determinísticos — reexportar o mesmo projeto mantém os
 * mesmos IDs, então o Minecraft atualiza o pack em vez de duplicar.
 */

export type PackFile = { path: string; content: Buffer }
export type PackBuild = { files: PackFile[]; bpUuid: string; rpUuid: string; warnings: string[] }

const json = (value: unknown) => JSON.stringify(value, null, 2)

/** UUID estável a partir de uma semente textual. */
function uuid(seed: string): string {
  const hex = crypto.createHash('sha256').update(seed).digest('hex')
  const chars = hex.padEnd(32, '0').slice(0, 32).split('')
  // Versão 4 + variante RFC 4122.
  chars[12] = '4'
  chars[16] = ((Number.parseInt(chars[16], 16) & 0x3) | 0x8).toString(16)
  return [
    chars.slice(0, 8).join(''),
    chars.slice(8, 12).join(''),
    chars.slice(12, 16).join(''),
    chars.slice(16, 20).join(''),
    chars.slice(20, 32).join(''),
  ].join('-')
}

const DIG_TAGS: Record<string, string> = {
  pickaxe: "q.any_tag('stone', 'metal', 'ore')",
  axe: "q.any_tag('wood', 'plant', 'leaves')",
  shovel: "q.any_tag('dirt', 'sand', 'gravel', 'snow')",
  hoe: "q.any_tag('plant', 'leaves')",
}

const ENCHANT_SLOT: Record<string, string> = {
  pickaxe: 'pickaxe',
  axe: 'axe',
  shovel: 'shovel',
  hoe: 'hoe',
  sword: 'sword',
}

const ARMOR_SLOT: Record<string, string> = {
  head: 'slot.armor.head',
  chest: 'slot.armor.chest',
  legs: 'slot.armor.legs',
  feet: 'slot.armor.feet',
}

const ARMOR_ENCHANT: Record<string, string> = {
  head: 'armor_head',
  chest: 'armor_torso',
  legs: 'armor_legs',
  feet: 'armor_feet',
}

const BLOCK_SOUNDS = new Set([
  'stone', 'wood', 'gravel', 'grass', 'glass', 'metal', 'sand', 'snow', 'wool', 'cloth', 'slime', 'nether',
])

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ------------------------------------------------------------------ */
/* Conteúdo                                                             */
/* ------------------------------------------------------------------ */

type TextureEntry = { short: string; png: Buffer }

export function buildPack(
  data: ProjectData,
  options: { projectId: string; kind?: string } = { projectId: 'local' },
): PackBuild {
  const warnings: string[] = []
  const namespace = slugifyNamespace(data.meta.namespace)
  const slug = slugifyName(data.meta.name || 'addon').replace(/-/g, '_')
  const engine = engineVersion(data.meta.targetVersion)
  const version = normalizeVersion(data.meta.version)

  const bpUuid = uuid(`${options.projectId}:bp`)
  const rpUuid = uuid(`${options.projectId}:rp`)

  const bpFiles: PackFile[] = []
  const rpFiles: PackFile[] = []
  const rootFiles: PackFile[] = []

  const itemTextures: TextureEntry[] = []
  const blockTextures: TextureEntry[] = []
  const entityTextures: TextureEntry[] = []

  /* ---------------- Itens ---------------- */

  for (const item of data.items) {
    const id = itemIdentifier(item, data.meta)
    const short = shortName(id)
    const components: Record<string, unknown> = {
      'minecraft:icon': { texture: short },
      'minecraft:max_stack_size': clamp(Math.round(item.maxStackSize) || 1, 1, 64),
      'minecraft:display_name': { value: item.displayName || short },
    }
    if (item.handEquipped) components['minecraft:hand_equipped'] = true

    if (item.food) {
      components['minecraft:food'] = {
        nutrition: clamp(Math.round(item.nutrition), 0, 20),
        saturation_modifier: Number(clamp(item.saturation, 0, 2).toFixed(2)),
        can_always_eat: Boolean(item.canAlwaysEat),
      }
      components['minecraft:use_modifiers'] = { use_duration: 1.6, movement_modifier: 0.35 }
      components['minecraft:max_stack_size'] = clamp(Math.round(item.maxStackSize) || 1, 1, 64)
    }

    if (item.tool) {
      const isWeapon = item.toolType === 'sword'
      components['minecraft:hand_equipped'] = true
      components['minecraft:damage'] = clamp(Math.round(item.damage), 0, 32767)
      components['minecraft:durability'] = {
        max_durability: clamp(Math.round(item.durability), 1, 100000),
      }
      components['minecraft:enchantable'] = {
        slot: ENCHANT_SLOT[item.toolType] ?? 'sword',
        value: 10 + clamp(Math.round(item.tier), 1, 5) * 2,
      }
      if (isWeapon) {
        components['minecraft:weapon'] = {}
      }
      const tag = DIG_TAGS[item.toolType]
      if (tag) {
        components['minecraft:digger'] = {
          use_efficiency: Number(clamp(item.efficiency, 0.5, 50).toFixed(2)),
          destroy_speeds: [{ block: { tags: tag }, speed: Number(clamp(item.efficiency, 1, 50).toFixed(2)) }],
        }
      }
      components['minecraft:max_stack_size'] = 1
    }

    if (item.armor) {
      components['minecraft:armor'] = { protection: clamp(Math.round(item.protection), 0, 20) }
      components['minecraft:wearable'] = { slot: ARMOR_SLOT[item.armorSlot] ?? 'slot.armor.chest' }
      components['minecraft:durability'] = {
        max_durability: clamp(Math.round(item.durability), 1, 100000),
      }
      components['minecraft:enchantable'] = {
        slot: ARMOR_ENCHANT[item.armorSlot] ?? 'armor_torso',
        value: 10,
      }
      components['minecraft:max_stack_size'] = 1
      components['minecraft:hand_equipped'] = false
    }

    if (item.fuel) {
      components['minecraft:fuel'] = { duration: Number(clamp(item.burnSeconds, 0.05, 100000).toFixed(2)) }
    }
    if (item.compostable) {
      components['minecraft:compostable'] = {
        composting_chance: Number((clamp(item.compostChance, 1, 100) / 100).toFixed(2)),
      }
    }
    if (item.throwable) {
      components['minecraft:throwable'] = {
        do_swing_animation: true,
        launch_power_scale: 1.2,
        max_draw_duration: 0,
        min_draw_duration: 0,
        scale_power_by_draw_duration: false,
      }
    }
    if (item.cooldown > 0) {
      components['minecraft:cooldown'] = {
        category: short,
        duration: Number(clamp(item.cooldown, 0, 1000).toFixed(2)),
      }
    }

    const description: Record<string, unknown> = { identifier: id }
    if (item.category && item.category !== 'none') {
      description['menu_category'] = {
        category: item.category,
        ...(item.group ? { group: item.group } : {}),
      }
    }

    bpFiles.push({
      path: `items/${short}.json`,
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.item,
          'minecraft:item': { description, components },
        }),
        'utf8',
      ),
    })

    itemTextures.push({
      short,
      png: decodeDataImage(item.texture ?? '') ?? generateItemTexture(id, item.color ?? undefined, item.shape === 'auto' ? undefined : item.shape),
    })
  }

  /* ---------------- Blocos ---------------- */

  for (const block of data.blocks) {
    const id = blockIdentifier(block, data.meta)
    const short = shortName(id)
    const height = block.height === 8 ? 8 : block.height === 4 ? 4 : 16

    // Bloco cheio usa a geometria vanilla (sem arquivo extra e sempre válida).
    // Meia-altura/camada precisam de geometria customizada.
    const isFullCube = height === 16

    const components: Record<string, unknown> = {
      'minecraft:geometry': isFullCube ? 'minecraft:geometry.full_block' : `geometry.${short}`,
      'minecraft:material_instances': {
        '*': { texture: short, render_method: 'opaque', face_dimming: true },
      },
      'minecraft:destructible_by_mining': {
        seconds_to_destroy: Number(clamp(block.hardness, 0.05, 1000).toFixed(2)),
      },
      'minecraft:destructible_by_explosion': {
        explosion_resistance: Number(clamp(block.resistance, 0, 1000).toFixed(2)),
      },
      'minecraft:friction': Number(clamp(block.friction, 0.1, 0.9).toFixed(2)),
    }

    if (height === 16) {
      components['minecraft:collision_box'] = true
      components['minecraft:selection_box'] = true
    } else {
      components['minecraft:collision_box'] = { origin: [-8, 0, -8], size: [16, height, 16] }
      components['minecraft:selection_box'] = { origin: [-8, 0, -8], size: [16, height, 16] }
    }

    if (block.lightEmission > 0) {
      components['minecraft:light_emission'] = clamp(Math.round(block.lightEmission), 0, 15)
    }
    if (block.lightDampening > 0) {
      components['minecraft:light_dampening'] = clamp(Math.round(block.lightDampening), 0, 15)
    }
    if (block.flammable) {
      components['minecraft:flammable'] = {
        catch_chance_modifier: clamp(Math.round(block.flameOdds), 0, 100),
        destroy_chance_modifier: clamp(Math.round(block.burnOdds), 0, 100),
      }
    }
    if (block.mapColor && /^#[0-9a-fA-F]{6}$/.test(block.mapColor)) {
      components['minecraft:map_color'] = block.mapColor
    }

    const lootPath = `loot_tables/blocks/${short}.json`
    components['minecraft:loot'] = lootPath
    bpFiles.push({ path: lootPath, content: Buffer.from(json(blockLoot(block, id)), 'utf8') })

    const description: Record<string, unknown> = { identifier: id }
    if (block.category && block.category !== 'none') {
      description['menu_category'] = {
        category: block.category,
        ...(block.group ? { group: block.group } : {}),
      }
    }

    bpFiles.push({
      path: `blocks/${short}.json`,
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.block,
          'minecraft:block': { description, components },
        }),
        'utf8',
      ),
    })

    // Item do bloco — necessário para ele aparecer no inventário criativo.
    const blockItemComponents: Record<string, unknown> = {
      'minecraft:icon': { texture: short },
      'minecraft:block_placer': { block: id },
      'minecraft:max_stack_size': 64,
      'minecraft:display_name': { value: block.displayName || short },
    }
    bpFiles.push({
      path: `items/${short}.json`,
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.item,
          'minecraft:item': {
            description: {
              identifier: id,
              ...(block.category && block.category !== 'none'
                ? {
                    menu_category: {
                      category: block.category,
                      ...(block.group ? { group: block.group } : {}),
                    },
                  }
                : {}),
            },
            components: blockItemComponents,
          },
        }),
        'utf8',
      ),
    })

    if (!isFullCube) {
      rpFiles.push({
        path: `models/blocks/${short}.geo.json`,
        content: Buffer.from(json(buildBlockGeometry(id, height)), 'utf8'),
      })
    }

    blockTextures.push({
      short,
      png: decodeDataImage(block.texture ?? '') ?? generateBlockTexture(id, block.color ?? undefined),
    })
    // Também entra no atlas de itens para o ícone do inventário.
    itemTextures.push({ short, png: blockTextures[blockTextures.length - 1].png })
  }

  /* ---------------- Entidades ---------------- */

  for (const entity of data.entities) {
    const id = entityIdentifier(entity, data.meta)
    const short = shortName(id)
    const geo = buildCreatureGeometry(id, 1)

    const components: Record<string, unknown> = {
      'minecraft:type_family': { family: [entity.isHostile ? 'monster' : 'mob'] },
      'minecraft:health': { value: clamp(Math.round(entity.health), 1, 1024), max: clamp(Math.round(entity.health), 1, 1024) },
      'minecraft:movement': { value: Number(clamp(entity.speed, 0, 2).toFixed(3)) },
      'minecraft:collision_box': {
        width: Number(clamp(entity.width, 0.1, 4).toFixed(2)),
        height: Number(clamp(entity.height, 0.1, 6).toFixed(2)),
      },
      'minecraft:physics': { has_gravity: true, has_collision: true },
      'minecraft:navigation.walk': {
        can_walk: true,
        can_walk_in_water: Boolean(entity.isAquatic),
        avoid_water: !entity.isAquatic,
        can_pass_doors: true,
        can_open_doors: false,
      },
      'minecraft:movement.basic': {},
      'minecraft:jump.static': {},
      'minecraft:breathable': {
        total_supply: 15,
        suffocate_time: 0,
        breathes_air: true,
        breathes_water: Boolean(entity.isAquatic),
        breathes_lava: false,
        breathes_solids: false,
      },
      'minecraft:behavior.random_look_around': { priority: 9 },
      'minecraft:behavior.look_at_player': { priority: 7, look_distance: Number(clamp(entity.followRange, 1, 64).toFixed(1)), probability: 0.02 },
      'minecraft:behavior.random_stroll': { priority: 6, speed_multiplier: 0.8 },
    }

    if (entity.knockbackResistance > 0) {
      components['minecraft:knockback_resistance'] = {
        value: Number(clamp(entity.knockbackResistance, 0, 1).toFixed(2)),
      }
    }
    if (entity.isFireImmune) components['minecraft:fire_immune'] = true

    if (entity.isHostile) {
      components['minecraft:attack'] = { damage: clamp(Math.round(entity.damage), 0, 100) }
      components['minecraft:behavior.hurt_by_target'] = { priority: 1 }
      components['minecraft:behavior.nearest_attackable_target'] = {
        priority: 2,
        must_see: true,
        reselect_targets: true,
        within_radius: Number(clamp(entity.followRange, 1, 64).toFixed(1)),
        entity_types: [
          {
            filters: { test: 'is_family', subject: 'other', value: 'player' },
            max_dist: Number(clamp(entity.followRange, 1, 64).toFixed(1)),
          },
        ],
      }
      components['minecraft:behavior.melee_attack'] = {
        priority: 3,
        speed_multiplier: 1.2,
        track_target: true,
      }
    } else {
      components['minecraft:behavior.panic'] = { priority: 1, speed_multiplier: 1.4 }
    }

    if (entity.isTameable) {
      components['minecraft:tameable'] = {
        probability: 0.33,
        tame_items: ['minecraft:bone', 'minecraft:apple', 'minecraft:wheat'],
        tame_event: { event: 'minecraft:on_tame', target: 'self' },
      }
      components['minecraft:behavior.follow_owner'] = {
        priority: 4,
        speed_multiplier: 1.1,
        start_distance: 12,
        stop_distance: 2,
      }
    }

    if (entity.isRideable) {
      components['minecraft:rideable'] = {
        seat_count: 1,
        family_types: ['player'],
        seats: [{ position: [0, 1.4, 0], min_rider_count: 0, max_rider_count: 1 }],
      }
    }

    const drops = (entity.drops ?? []).filter((d) => d.item && d.max > 0)
    if (drops.length) {
      const lootPath = `loot_tables/entities/${short}.json`
      components['minecraft:loot'] = { table: lootPath }
      bpFiles.push({
        path: lootPath,
        content: Buffer.from(
          json({
            pools: [
              {
                rolls: 1,
                entries: drops.map((d) => ({
                  type: 'item',
                  name: d.item,
                  weight: 1,
                  count: { min: clamp(Math.round(d.min), 0, 64), max: clamp(Math.round(d.max), 0, 64) },
                })),
              },
            ],
          }),
          'utf8',
        ),
      })
    }

    bpFiles.push({
      path: `entities/${short}.json`,
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.entity,
          'minecraft:entity': {
            description: {
              identifier: id,
              is_spawnable: true,
              is_summonable: true,
              is_experimental: false,
            },
            components,
          },
        }),
        'utf8',
      ),
    })

    // Lado cliente (resource pack).
    rpFiles.push({
      path: `models/entity/${short}.geo.json`,
      content: Buffer.from(json(geo.file), 'utf8'),
    })
    rpFiles.push({
      path: `entity/${short}.json`,
      content: Buffer.from(json(clientEntity(id, short, entity)), 'utf8'),
    })
    rpFiles.push({
      path: `animations/${short}.json`,
      content: Buffer.from(json(entityAnimations(short)), 'utf8'),
    })
    rpFiles.push({
      path: `animation_controllers/${short}.json`,
      content: Buffer.from(json(entityController(short)), 'utf8'),
    })

    entityTextures.push({
      short,
      png:
        decodeDataImage(entity.texture ?? '') ??
        generateEntityTexture(id, geo.textureSize, geo.rects, entity.color ?? undefined),
    })
  }

  /* ---------------- Receitas ---------------- */

  for (const recipe of data.recipes) {
    const built = buildRecipe(recipe, data.meta, namespace)
    if (!built) {
      warnings.push(`Receita "${recipe.key}" ignorada: resultado inválido.`)
      continue
    }
    bpFiles.push({ path: `recipes/${shortName(built.id)}.json`, content: Buffer.from(json(built.file), 'utf8') })
  }

  /* ---------------- Manifests ---------------- */

  const hasBp = bpFiles.length > 0
  const hasRp = rpFiles.length > 0 || itemTextures.length > 0 || blockTextures.length > 0 || entityTextures.length > 0

  const icon = decodeDataImage(data.meta.packIcon ?? '') ?? generatePackIcon(`${options.projectId}:${data.meta.name}`, undefined)

  const bpFolder = `${slug}_BP`
  const rpFolder = `${slug}_RP`

  if (hasBp) {
    bpFiles.push({
      path: 'manifest.json',
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.manifest,
          header: {
            name: `${data.meta.name} (BP)`,
            description: `${data.meta.description} — alvo ${data.meta.targetVersion}`,
            uuid: bpUuid,
            version,
            min_engine_version: engine,
          },
          modules: [{ type: 'data', uuid: uuid(`${options.projectId}:bp-module`), version }],
          ...(hasRp ? { dependencies: [{ uuid: rpUuid, version }] } : {}),
        }),
        'utf8',
      ),
    })
    bpFiles.push({ path: 'pack_icon.png', content: icon })
  }

  if (hasRp) {
    const blocksJson: Record<string, unknown> = { format_version: [1, 1, 0] }
    for (const block of data.blocks) {
      blocksJson[blockIdentifier(block, data.meta)] = {
        textures: shortName(blockIdentifier(block, data.meta)),
        sound: BLOCK_SOUNDS.has(block.sound) ? block.sound : 'stone',
      }
    }
    if (data.blocks.length) {
      rpFiles.push({ path: 'blocks.json', content: Buffer.from(json(blocksJson), 'utf8') })
    }

    if (itemTextures.length) {
      rpFiles.push({
        path: 'textures/item_texture.json',
        content: Buffer.from(
          json({
            resource_pack_name: rpFolder.toLowerCase(),
            texture_name: 'atlas.items',
            texture_data: Object.fromEntries(
              dedupeByShort(itemTextures).map((t) => [t.short, { textures: `textures/items/${t.short}` }]),
            ),
          }),
          'utf8',
        ),
      })
    }

    if (blockTextures.length) {
      rpFiles.push({
        path: 'textures/terrain_texture.json',
        content: Buffer.from(
          json({
            resource_pack_name: rpFolder.toLowerCase(),
            texture_name: 'atlas.terrain',
            padding: 8,
            num_mip_levels: 4,
            texture_data: Object.fromEntries(
              dedupeByShort(blockTextures).map((t) => [t.short, { textures: `textures/blocks/${t.short}` }]),
            ),
          }),
          'utf8',
        ),
      })
    }

    rpFiles.push({
      path: 'manifest.json',
      content: Buffer.from(
        json({
          format_version: FORMAT_VERSIONS.manifest,
          header: {
            name: `${data.meta.name} (RP)`,
            description: `${data.meta.description} — alvo ${data.meta.targetVersion}`,
            uuid: rpUuid,
            version,
            min_engine_version: engine,
          },
          modules: [{ type: 'resources', uuid: uuid(`${options.projectId}:rp-module`), version }],
        }),
        'utf8',
      ),
    })
    rpFiles.push({ path: 'pack_icon.png', content: icon })
  }

  for (const t of dedupeByShort(itemTextures)) {
    rpFiles.push({ path: `textures/items/${t.short}.png`, content: t.png })
  }
  for (const t of dedupeByShort(blockTextures)) {
    rpFiles.push({ path: `textures/blocks/${t.short}.png`, content: t.png })
  }
  for (const t of dedupeByShort(entityTextures)) {
    rpFiles.push({ path: `textures/entity/${t.short}.png`, content: t.png })
  }

  /* ---------------- Mundos ---------------- */

  if (options.kind === 'world' && hasBp) {
    rootFiles.push({
      path: 'world_behavior_packs.json',
      content: Buffer.from(json([{ pack_id: bpUuid, version }]), 'utf8'),
    })
    if (hasRp) {
      rootFiles.push({
        path: 'world_resource_packs.json',
        content: Buffer.from(json([{ pack_id: rpUuid, version }]), 'utf8'),
      })
    }
    rootFiles.push({
      path: 'MUNDO.txt',
      content: Buffer.from(worldReadme(data, bpUuid, rpUuid, hasRp), 'utf8'),
    })
  }

  /* ---------------- Árvore final ---------------- */

  const files: PackFile[] = [
    ...rootFiles,
    ...bpFiles.map((f) => ({ path: `${bpFolder}/${f.path}`, content: f.content })),
    ...rpFiles.map((f) => ({ path: `${rpFolder}/${f.path}`, content: f.content })),
  ]

  if (!hasBp && !hasRp) {
    warnings.push('Seu projeto ainda não tem conteúdo. Adicione um item, bloco, mob ou receita.')
  }

  return { files, bpUuid, rpUuid, warnings }
}

/* ------------------------------------------------------------------ */
/* Auxiliares                                                           */
/* ------------------------------------------------------------------ */

function dedupeByShort(entries: TextureEntry[]): TextureEntry[] {
  const map = new Map<string, TextureEntry>()
  for (const entry of entries) if (!map.has(entry.short)) map.set(entry.short, entry)
  return [...map.values()]
}

function normalizeVersion(version: unknown): [number, number, number] {
  if (Array.isArray(version) && version.length === 3) {
    return version.map((v) => clamp(Math.round(Number(v) || 0), 0, 999)) as [number, number, number]
  }
  return [1, 0, 0]
}

function blockLoot(block: BlockDef, identifier: string) {
  const name = block.dropsSelf ? identifier : (block.dropItem ?? '').trim()
  const count = {
    min: clamp(Math.round(block.dropMin) || 1, 0, 64),
    max: clamp(Math.max(Math.round(block.dropMax) || 1, Math.round(block.dropMin) || 1), 0, 64),
  }
  if (!name) {
    // Sem drop: ainda precisa existir uma tabela válida.
    return { pools: [] }
  }
  return {
    pools: [{ rolls: 1, entries: [{ type: 'item', name, weight: 1, count }] }],
  }
}

function clientEntity(id: string, short: string, entity: EntityDef) {
  return {
    format_version: FORMAT_VERSIONS.clientEntity,
    'minecraft:client_entity': {
      description: {
        identifier: id,
        materials: { default: entity.isAquatic ? 'entity_alphatest' : 'entity_alphatest' },
        textures: { default: `textures/entity/${short}` },
        geometry: { default: `geometry.${short}` },
        animations: {
          walk: `animation.${short}.walk`,
          idle: `animation.${short}.idle`,
        },
        scripts: { animate: [`controller.animation.${short}`] },
        render_controllers: ['controller.render.default'],
        ...(entity.spawnEgg
          ? {
              spawn_egg: {
                base_color: normalizeHex(entity.eggBase, '#3fc95c'),
                overlay_color: normalizeHex(entity.eggOverlay, '#1f8234'),
              },
            }
          : {}),
      },
    },
  }
}

function normalizeHex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : fallback
}

function entityAnimations(short: string) {
  const leg = (phase: number) => ({
    rotation: [`Math.cos(q.anim_time * 620 + ${phase}) * 26`, 0, 0],
  })
  return {
    format_version: '1.10.0',
    animations: {
      [`animation.${short}.walk`]: {
        loop: true,
        animation_length: 0.6,
        bones: {
          leg_front_left: leg(0),
          leg_front_right: leg(180),
          leg_back_left: leg(180),
          leg_back_right: leg(0),
          head: { rotation: ['Math.cos(q.anim_time * 240) * 4', 0, 0] },
        },
      },
      [`animation.${short}.idle`]: {
        loop: true,
        animation_length: 2.4,
        bones: {
          head: {
            rotation: ['Math.cos(q.anim_time * 60) * 5', 'Math.sin(q.anim_time * 42) * 8', 0],
          },
        },
      },
    },
  }
}

function entityController(short: string) {
  return {
    format_version: '1.10.0',
    animation_controllers: {
      [`controller.animation.${short}`]: {
        initial_state: 'default',
        states: {
          default: {
            animations: [{ idle: 'q.modified_move_speed < 0.1' }],
            transitions: [{ walk: 'q.modified_move_speed > 0.1' }],
          },
          walk: {
            animations: ['walk'],
            transitions: [{ default: 'q.modified_move_speed < 0.1' }],
          },
        },
      },
    },
  }
}

function buildRecipe(recipe: RecipeDef, _meta: ProjectData['meta'], namespace: string) {
  const id = `${slugifyNamespace(namespace)}:${slugifyName(recipe.key)}`
  const resultItem = (recipe.result || '').trim()
  if (!resultItem || !resultItem.includes(':')) return null

  const result: Record<string, unknown> = { item: resultItem }
  if (recipe.resultCount > 1) result.count = clamp(Math.round(recipe.resultCount), 1, 64)

  const tags = recipe.tags?.length ? recipe.tags : ['crafting_table']

  if (recipe.type === 'shapeless') {
    const ingredients = recipe.ingredients.map(toIngredient).filter(Boolean)
    if (!ingredients.length) return null
    return {
      id,
      file: {
        format_version: FORMAT_VERSIONS.recipe,
        'minecraft:recipe_shapeless': {
          description: { identifier: id },
          tags,
          ingredients,
          result,
        },
      },
    }
  }

  if (recipe.type === 'furnace') {
    const input = toIngredient(recipe.ingredients[0] ?? '')
    if (!input) return null
    return {
      id,
      file: {
        format_version: FORMAT_VERSIONS.recipe,
        'minecraft:recipe_furnace': {
          description: { identifier: id },
          tags: tags.length ? tags : ['furnace'],
          input,
          output: result,
        },
      },
    }
  }

  // Shaped
  const pattern = recipe.pattern.map((row) => (row ?? '').padEnd(3, ' ').slice(0, 3))
  const used = new Set(pattern.join('').replace(/\s/g, '').split(''))
  const key: Record<string, unknown> = {}
  for (const char of used) {
    const mapped = toIngredient(recipe.keyMap?.[char] ?? '')
    if (!mapped) return null
    key[char] = mapped
  }
  if (!Object.keys(key).length) return null

  return {
    id,
    file: {
      format_version: FORMAT_VERSIONS.recipe,
      'minecraft:recipe_shaped': {
        description: { identifier: id },
        tags,
        pattern,
        key,
        result,
      },
    },
  }
}

function toIngredient(value: string): Record<string, string> | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('tag:')) return { tag: raw.slice(4).trim() }
  return { item: raw }
}

function worldReadme(data: ProjectData, bpUuid: string, rpUuid: string, hasRp: boolean): string {
  const w = data.world
  return [
    'CraftForge — Configuração de Mundo',
    '==================================',
    '',
    `Mundo: ${data.meta.name}`,
    `Semente: ${w.seed || '(aleatória)'}`,
    `Modo de jogo: ${w.gamemode}`,
    `Dificuldade: ${w.difficulty}`,
    `PvP: ${w.pvp ? 'ativado' : 'desativado'}`,
    `Trapaças: ${w.cheats ? 'ativadas' : 'desativadas'}`,
    `Estruturas: ${w.generateStructures ? 'sim' : 'não'}`,
    `Distância de simulação: ${w.simulationDistance}`,
    `Manter inventário: ${w.keepInventory ? 'sim' : 'não'}`,
    '',
    'Como usar:',
    '1. Abra o .mcaddon neste pacote — ele importa o behavior pack e o resource pack.',
    '2. Crie um mundo novo (ou abra um existente).',
    '3. Em "Packs de comportamento" e "Packs de recursos", ative os packs deste addon.',
    '4. Se quiser aplicar automático, copie world_behavior_packs.json e',
    `   world_resource_packs.json para a pasta do seu mundo.`,
    '',
    `Behavior pack UUID: ${bpUuid}`,
    ...(hasRp ? [`Resource pack UUID: ${rpUuid}`] : []),
    '',
    'Feito no CraftForge.',
  ].join('\n')
}
