import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPack } from '../src/lib/generator/pack'
import { starterProject, emptyProject } from '../src/lib/generator/types'
import { validateProject } from '../src/lib/generator/validate'
import { zipPack } from '../src/lib/generator/zip'
import { encodePNG } from '../src/lib/png'
import { generateBlockTexture, generateItemTexture, generatePackIcon } from '../src/lib/texture'

test('starter project gera pack válido', () => {
  const data = starterProject('Meu Addon', 'forge')
  const result = validateProject(data)
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors, null, 2))

  const pack = buildPack(data, { projectId: 'test-1' })
  const paths = pack.files.map((f) => f.path)

  assert.ok(paths.includes('meu_addon_BP/manifest.json'))
  assert.ok(paths.includes('meu_addon_RP/manifest.json'))
  assert.ok(paths.includes('meu_addon_BP/items/rubi.json'))
  assert.ok(paths.includes('meu_addon_BP/blocks/bloco_de_rubi.json'))
  assert.ok(paths.includes('meu_addon_RP/textures/items/rubi.png'))
  assert.ok(paths.includes('meu_addon_RP/textures/blocks/bloco_de_rubi.png'))
})

test('todo JSON gerado é parseável e tem format_version', () => {
  const data = starterProject('Teste', 'forge')
  data.entities.push({
    id: 'e1',
    key: 'cubo',
    displayName: 'Cubo Saltitante',
    texture: null,
    color: '#5ddc7c',
    health: 24,
    damage: 4,
    speed: 0.3,
    followRange: 16,
    knockbackResistance: 0.2,
    width: 0.9,
    height: 1.9,
    isHostile: true,
    isTameable: false,
    isAquatic: false,
    isFireImmune: false,
    isRideable: false,
    spawnEgg: true,
    eggBase: '#3fc95c',
    eggOverlay: '#1f8234',
    drops: [{ id: 'd1', item: 'forge:rubi', min: 1, max: 3, chance: 1 }],
  })
  const pack = buildPack(data, { projectId: 'test-2' })

  for (const file of pack.files) {
    if (!file.path.endsWith('.json')) continue
    const parsed = JSON.parse(file.content.toString('utf8'))
    assert.ok(typeof parsed === 'object', `${file.path} não é objeto`)
    // Loot tables, blocks.json e os atlases de textura não usam format_version.
    const exempt = /loot_tables\/|blocks\.json$|item_texture\.json$|terrain_texture\.json$/
    if (!exempt.test(file.path)) {
      assert.ok('format_version' in parsed, `${file.path} sem format_version`)
    }
  }

  const entity = JSON.parse(
    pack.files.find((f) => f.path.endsWith('_BP/entities/cubo.json'))!.content.toString('utf8'),
  )
  assert.equal(entity['minecraft:entity'].description.identifier, 'forge:cubo')
  assert.equal(entity['minecraft:entity'].components['minecraft:health'].value, 24)
  assert.ok(entity['minecraft:entity'].components['minecraft:behavior.melee_attack'])
})

test('manifests usam min_engine_version 1.26.52 e UUIDs estáveis', () => {
  const data = starterProject('Addon', 'forge')
  const a = buildPack(data, { projectId: 'projeto-x' })
  const b = buildPack(data, { projectId: 'projeto-x' })
  assert.equal(a.bpUuid, b.bpUuid)

  const manifest = JSON.parse(
    a.files.find((f) => f.path.endsWith('_BP/manifest.json'))!.content.toString('utf8'),
  )
  assert.deepEqual(manifest.header.min_engine_version, [1, 26, 52])
  assert.equal(manifest.format_version, 2)
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(manifest.header.uuid))
  assert.ok(manifest.dependencies[0].uuid)
})

test('itens com format >= 1.26.30 sempre têm componentes', () => {
  const data = emptyProject('Vazio', 'forge')
  data.items.push({
    id: 'i1', key: 'pingente', displayName: 'Pingente', category: 'items', group: '',
    maxStackSize: 16, handEquipped: false, texture: null, color: '#ff0000', shape: 'auto',
    food: false, nutrition: 4, saturation: 0.6, canAlwaysEat: false,
    tool: false, toolType: 'none', tier: 2, damage: 3, durability: 200, efficiency: 6,
    armor: false, armorSlot: 'chest', protection: 5,
    fuel: false, burnSeconds: 160, compostable: false, compostChance: 30,
    throwable: false, cooldown: 0,
  })
  const pack = buildPack(data, { projectId: 'test-4' })
  const item = JSON.parse(
    pack.files.find((f) => f.path.endsWith('_BP/items/pingente.json'))!.content.toString('utf8'),
  )
  assert.equal(item.format_version, '1.26.50')
  assert.ok(Object.keys(item['minecraft:item'].components).length > 0)
})

test('validador detecta identificadores duplicados', () => {
  const data = emptyProject('Dup', 'forge')
  const base = {
    id: 'a', key: 'mesmo', displayName: 'A', category: 'items', group: '',
    maxStackSize: 64, handEquipped: false, texture: null, color: null, shape: 'auto' as const,
    food: false, nutrition: 4, saturation: 0.6, canAlwaysEat: false,
    tool: false, toolType: 'none' as const, tier: 2, damage: 3, durability: 200, efficiency: 6,
    armor: false, armorSlot: 'chest' as const, protection: 5,
    fuel: false, burnSeconds: 160, compostable: false, compostChance: 30,
    throwable: false, cooldown: 0,
  }
  data.items.push({ ...base, id: 'a' }, { ...base, id: 'b' })
  const result = validateProject(data)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => e.code === 'dup_item'))
})

test('namespace reservado é bloqueado e namespace sujo é normalizado', () => {
  const data = starterProject('X', 'forge')
  data.meta.namespace = 'minecraft'
  const result = validateProject(data)
  assert.ok(result.errors.some((e) => e.code === 'namespace'))

  const dirty = starterProject('Y', 'forge')
  dirty.meta.namespace = 'Meu Addon!!'
  assert.ok(validateProject(dirty).warnings.some((e) => e.code === 'namespace_normalized'))
})

test('PNG gerado tem assinatura e dimensões corretas', () => {
  const png = generateBlockTexture('forge:pedra', '#888888')
  assert.equal(png[0], 0x89)
  assert.equal(png[1], 0x50)
  assert.equal(png.length > 100, true)

  const custom = encodePNG(2, 2, Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]))
  assert.equal(custom.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(custom.readUInt32BE(16), 2)
  assert.equal(custom.readUInt32BE(20), 2)

  assert.ok(generateItemTexture('forge:rubi').length > 50)
  assert.ok(generatePackIcon('projeto').length > 100)
})

test('zip do pack é gerado e pode ser relido', async () => {
  const data = starterProject('Zipado', 'forge')
  const pack = buildPack(data, { projectId: 'test-zip' })
  const buf = await zipPack(pack.files)
  assert.ok(buf.length > 500)
  assert.equal(buf[0], 0x50) // 'P' de PK
  assert.equal(buf[1], 0x4b)
})
