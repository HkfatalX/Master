import { IDENTIFIER_RE, RESERVED_NAMESPACES, slugifyName, slugifyNamespace } from '../minecraft'
import {
  blockIdentifier,
  entityIdentifier,
  itemIdentifier,
  ns,
  type ProjectData,
} from './types'

/**
 * Validador do projeto. Roda antes de todo save e de todo export.
 * Erros bloqueiam o export; avisos só aparecem no painel.
 */

export type IssueLevel = 'error' | 'warning'
export type Issue = {
  level: IssueLevel
  code: string
  message: string
  /** Caminho no projeto, ex.: `items[2].key` */
  at?: string
}

export type ValidationResult = {
  ok: boolean
  errors: Issue[]
  warnings: Issue[]
}

const isIdentifier = (value: string) => IDENTIFIER_RE.test(value)

export function validateProject(data: ProjectData): ValidationResult {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const namespace = ns(data.meta)

  /* ---------------- Meta ---------------- */

  if (!data.meta.name || data.meta.name.trim().length < 2) {
    errors.push({ level: 'error', code: 'name', message: 'Dê um nome ao projeto (2+ caracteres).', at: 'meta.name' })
  }
  if (data.meta.name.length > 48) {
    errors.push({ level: 'error', code: 'name_long', message: 'O nome do projeto deve ter até 48 caracteres.', at: 'meta.name' })
  }
  const rawNamespace = String(data.meta.namespace ?? '').trim().toLowerCase()
  if (!rawNamespace) {
    errors.push({
      level: 'error',
      code: 'namespace',
      message: 'Defina um namespace para o seu conteúdo (ex.: forge).',
      at: 'meta.namespace',
    })
  } else if (RESERVED_NAMESPACES.has(rawNamespace)) {
    errors.push({
      level: 'error',
      code: 'namespace',
      message: `O namespace "${rawNamespace}" é reservado pelo Minecraft. Use outro (ex.: forge).`,
      at: 'meta.namespace',
    })
  }
  if (slugifyNamespace(data.meta.namespace) !== data.meta.namespace) {
    warnings.push({
      level: 'warning',
      code: 'namespace_normalized',
      message: `O namespace será normalizado para "${slugifyNamespace(data.meta.namespace)}".`,
      at: 'meta.namespace',
    })
  }
  if (!/^\d+\.\d+(\.\d+)?$/.test(data.meta.targetVersion ?? '')) {
    errors.push({ level: 'error', code: 'target', message: 'Versão alvo inválida.', at: 'meta.targetVersion' })
  }

  /* ---------------- Chaves duplicadas ---------------- */

  const seenItemKeys = new Map<string, number>()
  const seenBlockKeys = new Map<string, number>()
  const seenEntityKeys = new Map<string, number>()
  const seenRecipeKeys = new Map<string, number>()

  const knownItems = new Set<string>()
  const knownBlocks = new Set<string>()
  const knownEntities = new Set<string>()

  for (const item of data.items) {
    const id = itemIdentifier(item, data.meta)
    if (seenItemKeys.has(id)) {
      errors.push({
        level: 'error',
        code: 'dup_item',
        message: `Dois itens usam o identificador "${id}".`,
        at: `items.${item.id}.key`,
      })
    }
    seenItemKeys.set(id, 1)
    knownItems.add(id)
  }

  for (const block of data.blocks) {
    const id = blockIdentifier(block, data.meta)
    if (seenBlockKeys.has(id)) {
      errors.push({
        level: 'error',
        code: 'dup_block',
        message: `Dois blocos usam o identificador "${id}".`,
        at: `blocks.${block.id}.key`,
      })
    }
    // Blocos e itens dividem a pasta items/ no behavior pack.
    if (seenItemKeys.has(id)) {
      errors.push({
        level: 'error',
        code: 'block_item_clash',
        message: `"${id}" é usado por um item e por um bloco ao mesmo tempo.`,
        at: `blocks.${block.id}.key`,
      })
    }
    seenBlockKeys.set(id, 1)
    knownBlocks.add(id)
  }

  for (const entity of data.entities) {
    const id = entityIdentifier(entity, data.meta)
    if (seenEntityKeys.has(id)) {
      errors.push({
        level: 'error',
        code: 'dup_entity',
        message: `Duas criaturas usam o identificador "${id}".`,
        at: `entities.${entity.id}.key`,
      })
    }
    seenEntityKeys.set(id, 1)
    knownEntities.add(id)
  }

  for (const recipe of data.recipes) {
    const id = `${namespace}:${slugifyName(recipe.key)}`
    if (seenRecipeKeys.has(id)) {
      errors.push({
        level: 'error',
        code: 'dup_recipe',
        message: `Duas receitas usam o identificador "${id}".`,
        at: `recipes.${recipe.id}.key`,
      })
    }
    seenRecipeKeys.set(id, 1)
  }

  const knownOutputs = new Set<string>([...knownItems, ...knownBlocks])

  /* ---------------- Itens ---------------- */

  data.items.forEach((item, index) => {
    const at = `items.${item.id}`
    if (!slugifyName(item.key)) {
      errors.push({ level: 'error', code: 'item_key', message: `Item #${index + 1}: identificador inválido.`, at: `${at}.key` })
    }
    if (!item.displayName?.trim()) {
      warnings.push({ level: 'warning', code: 'item_name', message: `Item "${item.key}" sem nome de exibição.`, at: `${at}.displayName` })
    }
    const stack = Math.round(item.maxStackSize)
    if (!Number.isFinite(stack) || stack < 1 || stack > 64) {
      errors.push({ level: 'error', code: 'item_stack', message: `Item "${item.key}": empilhamento deve estar entre 1 e 64.`, at: `${at}.maxStackSize` })
    }
    if (item.tool && stack > 1) {
      warnings.push({ level: 'warning', code: 'tool_stack', message: `Ferramenta "${item.key}" com empilhamento ${stack} — o normal é 1.`, at: `${at}.maxStackSize` })
    }
    if (item.food) {
      const n = Math.round(item.nutrition)
      if (n < 0 || n > 20) {
        errors.push({ level: 'error', code: 'food', message: `Item "${item.key}": nutrição deve estar entre 0 e 20.`, at: `${at}.nutrition` })
      }
    }
    if (item.armor && item.armorSlot === 'none') {
      errors.push({ level: 'error', code: 'armor_slot', message: `Item "${item.key}": escolha o slot da armadura.`, at: `${at}.armorSlot` })
    }
    if (item.cooldown < 0 || item.cooldown > 600) {
      warnings.push({ level: 'warning', code: 'cooldown', message: `Item "${item.key}": recarga deve estar entre 0 e 600 s.`, at: `${at}.cooldown` })
    }
  })

  /* ---------------- Blocos ---------------- */

  data.blocks.forEach((block) => {
    const at = `blocks.${block.id}`
    if (!slugifyName(block.key)) {
      errors.push({ level: 'error', code: 'block_key', message: `Bloco "${block.key}": identificador inválido.`, at: `${at}.key` })
    }
    if (block.hardness <= 0) {
      warnings.push({ level: 'warning', code: 'hardness', message: `Bloco "${block.key}": dureza 0 deixa o bloco instantâneo.`, at: `${at}.hardness` })
    }
    if (!block.dropsSelf) {
      const drop = (block.dropItem ?? '').trim()
      if (!drop) {
        warnings.push({ level: 'warning', code: 'block_drop', message: `Bloco "${block.key}": sem drop definido, ele não soltará nada.`, at: `${at}.dropItem` })
      } else if (!isIdentifier(drop)) {
        errors.push({ level: 'error', code: 'block_drop_id', message: `Bloco "${block.key}": drop "${drop}" não é um identificador válido.`, at: `${at}.dropItem` })
      } else if (!knownOutputs.has(drop) && !drop.startsWith('minecraft:')) {
        warnings.push({ level: 'warning', code: 'block_drop_unknown', message: `Bloco "${block.key}": drop "${drop}" não existe neste projeto nem no vanilla.`, at: `${at}.dropItem` })
      }
      if (block.dropMax < block.dropMin) {
        errors.push({ level: 'error', code: 'block_drop_range', message: `Bloco "${block.key}": quantidade máxima menor que a mínima.`, at: `${at}.dropMax` })
      }
    }
  })

  /* ---------------- Criaturas ---------------- */

  data.entities.forEach((entity) => {
    const at = `entities.${entity.id}`
    if (!slugifyName(entity.key)) {
      errors.push({ level: 'error', code: 'entity_key', message: `Criatura "${entity.key}": identificador inválido.`, at: `${at}.key` })
    }
    if (!(entity.health > 0)) {
      errors.push({ level: 'error', code: 'entity_health', message: `Criatura "${entity.key}": vida deve ser maior que 0.`, at: `${at}.health` })
    }
    if (entity.isHostile && entity.damage <= 0) {
      warnings.push({ level: 'warning', code: 'entity_damage', message: `Criatura hostil "${entity.key}" com dano 0 não causará dano.`, at: `${at}.damage` })
    }
    entity.drops.forEach((drop, i) => {
      const dropItem = (drop.item ?? '').trim()
      if (!dropItem) {
        errors.push({ level: 'error', code: 'drop_empty', message: `Drop #${i + 1} de "${entity.key}" está vazio.`, at: `${at}.drops.${drop.id}` })
        return
      }
      if (!isIdentifier(dropItem)) {
        errors.push({ level: 'error', code: 'drop_id', message: `Drop "${dropItem}" não é um identificador válido.`, at: `${at}.drops.${drop.id}` })
        return
      }
      if (!knownOutputs.has(dropItem) && !dropItem.startsWith('minecraft:')) {
        warnings.push({ level: 'warning', code: 'drop_unknown', message: `Drop "${dropItem}" não existe neste projeto.`, at: `${at}.drops.${drop.id}` })
      }
      if (drop.max < drop.min || drop.max <= 0) {
        errors.push({ level: 'error', code: 'drop_range', message: `Drop "${dropItem}": quantidade inválida.`, at: `${at}.drops.${drop.id}` })
      }
    })
  })

  /* ---------------- Receitas ---------------- */

  data.recipes.forEach((recipe) => {
    const at = `recipes.${recipe.id}`
    const result = (recipe.result ?? '').trim()
    if (!result) {
      errors.push({ level: 'error', code: 'recipe_result', message: `Receita "${recipe.key}": defina o resultado.`, at: `${at}.result` })
    } else if (!isIdentifier(result)) {
      errors.push({ level: 'error', code: 'recipe_result_id', message: `Receita "${recipe.key}": resultado "${result}" inválido.`, at: `${at}.result` })
    } else if (!knownOutputs.has(result) && !result.startsWith('minecraft:')) {
      warnings.push({
        level: 'warning',
        code: 'recipe_result_unknown',
        message: `Receita "${recipe.key}": resultado "${result}" não existe neste projeto.`,
        at: `${at}.result`,
      })
    }

    if (recipe.type === 'shaped') {
      const pattern = recipe.pattern ?? []
      if (pattern.length !== 3) {
        errors.push({ level: 'error', code: 'recipe_pattern', message: `Receita "${recipe.key}": o molde precisa de 3 linhas.`, at: `${at}.pattern` })
      }
      pattern.forEach((row, i) => {
        if ((row ?? '').length > 3) {
          errors.push({ level: 'error', code: 'recipe_row', message: `Receita "${recipe.key}": linha ${i + 1} tem mais de 3 colunas.`, at: `${at}.pattern.${i}` })
        }
      })
      const used = new Set(pattern.join('').replace(/\s/g, '').split(''))
      for (const char of used) {
        const mapped = (recipe.keyMap?.[char] ?? '').trim()
        if (!mapped) {
          errors.push({
            level: 'error',
            code: 'recipe_keymap',
            message: `Receita "${recipe.key}": o símbolo "${char}" do molde não tem item definido.`,
            at: `${at}.keyMap`,
          })
        } else if (!mapped.startsWith('tag:') && !isIdentifier(mapped)) {
          errors.push({
            level: 'error',
            code: 'recipe_keymap_id',
            message: `Receita "${recipe.key}": "${mapped}" não é um item válido.`,
            at: `${at}.keyMap`,
          })
        }
      }
    } else {
      const ingredients = recipe.ingredients ?? []
      if (!ingredients.length) {
        errors.push({ level: 'error', code: 'recipe_ingredients', message: `Receita "${recipe.key}": adicione ao menos 1 ingrediente.`, at: `${at}.ingredients` })
      }
      ingredients.forEach((ing, i) => {
        const value = (ing ?? '').trim()
        if (!value) return
        if (!value.startsWith('tag:') && !isIdentifier(value)) {
          errors.push({
            level: 'error',
            code: 'recipe_ingredient_id',
            message: `Receita "${recipe.key}": ingrediente "${value}" inválido.`,
            at: `${at}.ingredients.${i}`,
          })
        }
      })
    }

    if (!recipe.tags?.length) {
      warnings.push({ level: 'warning', code: 'recipe_tags', message: `Receita "${recipe.key}": sem estação de crafting, ela não aparecerá.`, at: `${at}.tags` })
    }
  })

  /* ---------------- Resumo ---------------- */

  const total = data.items.length + data.blocks.length + data.entities.length + data.recipes.length
  if (total === 0) {
    warnings.push({
      level: 'warning',
      code: 'empty',
      message: 'Seu projeto está vazio. Adicione um item, bloco, mob ou receita para exportar.',
    })
  }

  return { ok: errors.length === 0, errors, warnings }
}

/** Checagem rápida usada no autosave (não bloqueia). */
export function quickIssues(data: ProjectData): Issue[] {
  return validateProject(data).errors
}
