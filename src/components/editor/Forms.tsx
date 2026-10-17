'use client'

import { useState } from 'react'
import { CREATIVE_CATEGORIES } from '@/lib/minecraft'
import type {
  BlockDef,
  EntityDef,
  ItemDef,
  ProjectData,
  RecipeDef,
  WorldSettings,
} from '@/lib/generator/types'
import {
  ColorField,
  Field,
  ImageField,
  NumberField,
  SelectField,
  SliderField,
  TextField,
  Toggle,
} from './Fields'

const CATEGORY_OPTIONS = CREATIVE_CATEGORIES.map((value) => ({
  value,
  label: {
    construction: 'Construção',
    nature: 'Natureza',
    equipment: 'Equipamentos',
    items: 'Itens',
    commands: 'Comandos',
    none: 'Nenhuma (sem menu criativo)',
  }[value] as string,
}))

const SHAPE_OPTIONS = [
  { value: 'auto', label: 'Automático (pelo nome)' },
  { value: 'gem', label: 'Gema' },
  { value: 'ingot', label: 'Barra' },
  { value: 'sword', label: 'Espada' },
  { value: 'orb', label: 'Orbe' },
  { value: 'food', label: 'Comida' },
  { value: 'tool', label: 'Ferramenta' },
  { value: 'disc', label: 'Disco' },
  { value: 'plant', label: 'Planta' },
] as const

const SOUND_OPTIONS = [
  'stone', 'wood', 'gravel', 'grass', 'glass', 'metal', 'sand', 'snow', 'wool', 'cloth', 'slime',
].map((value) => ({ value, label: value }))

const TAGS_OPTIONS = [
  { value: 'crafting_table', label: 'Bancada de trabalho' },
  { value: 'furnace', label: 'Fornalha' },
  { value: 'blast_furnace', label: 'Alto-forno' },
  { value: 'smoker', label: 'Defumador' },
  { value: 'campfire', label: 'Fogueira' },
  { value: 'stonecutter', label: 'Cortador de pedra' },
]

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-grass-400">{title}</h4>
      {hint && <p className="-mt-2 mb-3 text-[11px] text-slate-500">{hint}</p>}
      <div className="space-y-3.5">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Item                                                                 */
/* ------------------------------------------------------------------ */

export function ItemForm({
  item,
  namespace,
  onChange,
}: {
  item: ItemDef
  namespace: string
  onChange: (patch: Partial<ItemDef>) => void
}) {
  return (
    <div className="space-y-4">
      <Section title="Identidade">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Identificador" hint={`Vai virar ${namespace}:${item.key || 'item'}`}>
            <TextField value={item.key} onChange={(key) => onChange({ key })} placeholder="espada_de_rubi" />
          </Field>
          <Field label="Nome exibido">
            <TextField value={item.displayName} onChange={(displayName) => onChange({ displayName })} />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Aba do inventário">
            <SelectField
              value={item.category}
              onChange={(category) => onChange({ category })}
              options={CATEGORY_OPTIONS as { value: string; label: string }[]}
            />
          </Field>
          <Field label="Grupo (opcional)" hint="Ex.: minecraft:itemGroup.name.ore">
            <TextField value={item.group} onChange={(group) => onChange({ group })} maxLength={64} />
          </Field>
        </div>
      </Section>

      <Section title="Aparência">
        <ImageField value={item.texture} onChange={(texture) => onChange({ texture })} />
        <Field label="Cor base" hint="Usada quando a textura é gerada automaticamente.">
          <ColorField value={item.color} onChange={(color) => onChange({ color })} />
        </Field>
        <Field label="Formato da textura gerada">
          <SelectField
            value={item.shape}
            onChange={(shape) => onChange({ shape })}
            options={SHAPE_OPTIONS as unknown as { value: typeof item.shape; label: string }[]}
          />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Empilhamento (1–64)">
            <NumberField value={item.maxStackSize} min={1} max={64} onChange={(maxStackSize) => onChange({ maxStackSize })} />
          </Field>
          <Field label="Recarga em segundos (0 = sem)">
            <NumberField value={item.cooldown} min={0} max={600} step={0.5} onChange={(cooldown) => onChange({ cooldown })} />
          </Field>
        </div>
        <Toggle
          label="Segurar na mão"
          description="Modelo 3D na mão em vez de ícone plano."
          checked={item.handEquipped}
          onChange={(handEquipped) => onChange({ handEquipped })}
        />
        <Toggle
          label="Arremessável"
          checked={item.throwable}
          onChange={(throwable) => onChange({ throwable })}
        />
      </Section>

      <Section title="Comida">
        <Toggle label="É comida" checked={item.food} onChange={(food) => onChange({ food })} />
        {item.food && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Nutrição (0–20)">
              <NumberField value={item.nutrition} min={0} max={20} onChange={(nutrition) => onChange({ nutrition })} />
            </Field>
            <Field label="Saciedade (0–2)">
              <NumberField value={item.saturation} min={0} max={2} step={0.1} onChange={(saturation) => onChange({ saturation })} />
            </Field>
          </div>
        )}
        {item.food && (
          <Toggle
            label="Pode comer com fome cheia"
            checked={item.canAlwaysEat}
            onChange={(canAlwaysEat) => onChange({ canAlwaysEat })}
          />
        )}
      </Section>

      <Section title="Ferramenta / arma">
        <Toggle label="É ferramenta ou arma" checked={item.tool} onChange={(tool) => onChange({ tool })} />
        {item.tool && (
          <>
            <Field label="Tipo">
              <SelectField
                value={item.toolType}
                onChange={(toolType) => onChange({ toolType })}
                options={[
                  { value: 'sword', label: 'Espada' },
                  { value: 'pickaxe', label: 'Picareta' },
                  { value: 'axe', label: 'Machado' },
                  { value: 'shovel', label: 'Pá' },
                  { value: 'hoe', label: 'Enxada' },
                  { value: 'none', label: 'Só durabilidade' },
                ]}
              />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Dano (0–32767)">
                <NumberField value={item.damage} min={0} max={32767} onChange={(damage) => onChange({ damage })} />
              </Field>
              <Field label="Durabilidade">
                <NumberField value={item.durability} min={1} max={100000} step={10} onChange={(durability) => onChange({ durability })} />
              </Field>
            </div>
            {item.toolType !== 'sword' && item.toolType !== 'none' && (
              <Field label={`Velocidade de quebra (${item.toolType})`}>
                <SliderField value={item.efficiency} min={1} max={30} step={0.5} onChange={(efficiency) => onChange({ efficiency })} />
              </Field>
            )}
            <Field label="Nível de encantamento">
              <SliderField value={item.tier} min={1} max={5} step={1} onChange={(tier) => onChange({ tier })} />
            </Field>
          </>
        )}
      </Section>

      <Section title="Armadura">
        <Toggle label="É peça de armadura" checked={item.armor} onChange={(armor) => onChange({ armor })} />
        {item.armor && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Slot">
              <SelectField
                value={item.armorSlot}
                onChange={(armorSlot) => onChange({ armorSlot })}
                options={[
                  { value: 'head', label: 'Capacete' },
                  { value: 'chest', label: 'Peitoral' },
                  { value: 'legs', label: 'Calças' },
                  { value: 'feet', label: 'Botas' },
                  { value: 'none', label: 'Nenhum' },
                ]}
              />
            </Field>
            <Field label="Proteção (0–20)">
              <NumberField value={item.protection} min={0} max={20} onChange={(protection) => onChange({ protection })} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Extras">
        <Toggle label="Serve de combustível" checked={item.fuel} onChange={(fuel) => onChange({ fuel })} />
        {item.fuel && (
          <Field label="Queima por (segundos)">
            <NumberField value={item.burnSeconds} min={0.05} max={100000} step={5} onChange={(burnSeconds) => onChange({ burnSeconds })} />
          </Field>
        )}
        <Toggle label="Compostável" checked={item.compostable} onChange={(compostable) => onChange({ compostable })} />
        {item.compostable && (
          <Field label="Chance de compostagem (%)">
            <SliderField value={item.compostChance} min={1} max={100} step={1} onChange={(compostChance) => onChange({ compostChance })} suffix="%" />
          </Field>
        )}
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bloco                                                                */
/* ------------------------------------------------------------------ */

export function BlockForm({
  block,
  namespace,
  onChange,
}: {
  block: BlockDef
  namespace: string
  onChange: (patch: Partial<BlockDef>) => void
}) {
  return (
    <div className="space-y-4">
      <Section title="Identidade">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Identificador" hint={`Vai virar ${namespace}:${block.key || 'bloco'}`}>
            <TextField value={block.key} onChange={(key) => onChange({ key })} />
          </Field>
          <Field label="Nome exibido">
            <TextField value={block.displayName} onChange={(displayName) => onChange({ displayName })} />
          </Field>
        </div>
        <Field label="Aba do inventário">
          <SelectField
            value={block.category}
            onChange={(category) => onChange({ category })}
            options={CATEGORY_OPTIONS as { value: string; label: string }[]}
          />
        </Field>
      </Section>

      <Section title="Aparência">
        <ImageField value={block.texture} onChange={(texture) => onChange({ texture })} label="Textura PNG (16x16)" />
        <Field label="Cor base">
          <ColorField value={block.color} onChange={(color) => onChange({ color })} fallback="#888888" />
        </Field>
        <Field label="Formato">
          <SelectField
            value={String(block.height)}
            onChange={(value) => onChange({ height: Number(value) as 4 | 8 | 16 })}
            options={[
              { value: '16', label: 'Bloco cheio (16px)' },
              { value: '8', label: 'Laje (8px)' },
              { value: '4', label: 'Camada fina (4px)' },
            ]}
          />
        </Field>
        <Field label="Cor no mapa" hint="Opcional — cor exibida nos mapas.">
          <ColorField value={block.mapColor} onChange={(mapColor) => onChange({ mapColor })} fallback="#888888" />
        </Field>
      </Section>

      <Section title="Física">
        <Field label={`Dureza — ${block.hardness.toFixed(2)}s para quebrar`}>
          <SliderField value={block.hardness} min={0.05} max={20} step={0.05} onChange={(hardness) => onChange({ hardness })} suffix="s" />
        </Field>
        <Field label={`Resistência a explosão — ${block.resistance}`}>
          <SliderField value={block.resistance} min={0} max={100} step={0.5} onChange={(resistance) => onChange({ resistance })} />
        </Field>
        <Field label={`Fricção — ${block.friction.toFixed(2)}`}>
          <SliderField value={block.friction} min={0.1} max={0.9} step={0.05} onChange={(friction) => onChange({ friction })} />
        </Field>
        <Field label={`Emissão de luz — nível ${block.lightEmission}`}>
          <SliderField value={block.lightEmission} min={0} max={15} step={1} onChange={(lightEmission) => onChange({ lightEmission })} />
        </Field>
        <Field label={`Bloqueio de luz — ${block.lightDampening}`}>
          <SliderField value={block.lightDampening} min={0} max={15} step={1} onChange={(lightDampening) => onChange({ lightDampening })} />
        </Field>
        <Field label="Som">
          <SelectField value={block.sound} onChange={(sound) => onChange({ sound })} options={SOUND_OPTIONS} />
        </Field>
        <Toggle label="Inflamável" checked={block.flammable} onChange={(flammable) => onChange({ flammable })} />
        {block.flammable && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Chance de pegar fogo (%)">
              <NumberField value={block.flameOdds} min={0} max={100} onChange={(flameOdds) => onChange({ flameOdds })} />
            </Field>
            <Field label="Chance de queimar (%)">
              <NumberField value={block.burnOdds} min={0} max={100} onChange={(burnOdds) => onChange({ burnOdds })} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Drops">
        <Toggle label="Dropa ele mesmo" checked={block.dropsSelf} onChange={(dropsSelf) => onChange({ dropsSelf })} />
        {!block.dropsSelf && (
          <>
            <Field label="Item dropado" hint="Identificador completo, ex.: forge:rubi ou minecraft:diamond">
              <TextField value={block.dropItem ?? ''} onChange={(dropItem) => onChange({ dropItem })} maxLength={96} />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Quantidade mínima">
                <NumberField value={block.dropMin} min={0} max={64} onChange={(dropMin) => onChange({ dropMin })} />
              </Field>
              <Field label="Quantidade máxima">
                <NumberField value={block.dropMax} min={0} max={64} onChange={(dropMax) => onChange({ dropMax })} />
              </Field>
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Criatura                                                             */
/* ------------------------------------------------------------------ */

export function EntityForm({
  entity,
  namespace,
  onChange,
  contentOptions,
}: {
  entity: EntityDef
  namespace: string
  onChange: (patch: Partial<EntityDef>) => void
  contentOptions: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-4">
      <Section title="Identidade">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Identificador" hint={`Vai virar ${namespace}:${entity.key || 'criatura'}`}>
            <TextField value={entity.key} onChange={(key) => onChange({ key })} />
          </Field>
          <Field label="Nome exibido">
            <TextField value={entity.displayName} onChange={(displayName) => onChange({ displayName })} />
          </Field>
        </div>
      </Section>

      <Section title="Aparência" hint="Sem textura, o CraftForge gera uma e o modelo em bloco também.">
        <ImageField value={entity.texture} onChange={(texture) => onChange({ texture })} label="Textura da criatura" />
        <Field label="Cor base">
          <ColorField value={entity.color} onChange={(color) => onChange({ color })} />
        </Field>
      </Section>

      <Section title="Atributos">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Vida">
            <NumberField value={entity.health} min={1} max={1024} onChange={(health) => onChange({ health })} />
          </Field>
          <Field label="Dano de ataque">
            <NumberField value={entity.damage} min={0} max={100} onChange={(damage) => onChange({ damage })} />
          </Field>
          <Field label={`Velocidade — ${entity.speed.toFixed(2)}`}>
            <SliderField value={entity.speed} min={0} max={1.2} step={0.01} onChange={(speed) => onChange({ speed })} />
          </Field>
          <Field label={`Alcance de detecção — ${entity.followRange}`}>
            <SliderField value={entity.followRange} min={1} max={64} step={1} onChange={(followRange) => onChange({ followRange })} />
          </Field>
          <Field label={`Resistência a repulsão — ${entity.knockbackResistance.toFixed(2)}`}>
            <SliderField value={entity.knockbackResistance} min={0} max={1} step={0.05} onChange={(knockbackResistance) => onChange({ knockbackResistance })} />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Largura da colisão">
            <NumberField value={entity.width} min={0.1} max={4} step={0.1} onChange={(width) => onChange({ width })} />
          </Field>
          <Field label="Altura da colisão">
            <NumberField value={entity.height} min={0.1} max={6} step={0.1} onChange={(height) => onChange({ height })} />
          </Field>
        </div>
      </Section>

      <Section title="Comportamento">
        <Toggle label="Hostil" description="Ataca jogadores e outras criaturas por perto." checked={entity.isHostile} onChange={(isHostile) => onChange({ isHostile })} />
        <Toggle label="Domável" description="Pode ser domesticada com ossos, maçãs ou trigo." checked={entity.isTameable} onChange={(isTameable) => onChange({ isTameable })} />
        <Toggle label="Aquática" description="Respira debaixo d'água." checked={entity.isAquatic} onChange={(isAquatic) => onChange({ isAquatic })} />
        <Toggle label="Imune a fogo" checked={entity.isFireImmune} onChange={(isFireImmune) => onChange({ isFireImmune })} />
        <Toggle label="Montável" checked={entity.isRideable} onChange={(isRideable) => onChange({ isRideable })} />
      </Section>

      <Section title="Ovo de spawn">
        <Toggle label="Gerar ovo de spawn" checked={entity.spawnEgg} onChange={(spawnEgg) => onChange({ spawnEgg })} />
        {entity.spawnEgg && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Cor de base">
              <ColorField value={entity.eggBase} onChange={(eggBase) => onChange({ eggBase: eggBase ?? '#3fc95c' })} />
            </Field>
            <Field label="Cor de detalhe">
              <ColorField value={entity.eggOverlay} onChange={(eggOverlay) => onChange({ eggOverlay: eggOverlay ?? '#1f8234' })} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Drops" hint="O que a criatura solta ao morrer.">
        {entity.drops.length === 0 && (
          <p className="text-xs text-slate-500">Nenhum drop configurado.</p>
        )}
        {entity.drops.map((drop, index) => (
          <div key={drop.id} className="rounded-xl border border-white/[0.07] bg-ink-950/40 p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Drop {index + 1}</span>
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => onChange({ drops: entity.drops.filter((d) => d.id !== drop.id) })}
              >
                Remover
              </button>
            </div>
            <div className="space-y-2.5">
              <select
                className="input"
                value={drop.item}
                onChange={(e) =>
                  onChange({
                    drops: entity.drops.map((d) => (d.id === drop.id ? { ...d, item: e.target.value } : d)),
                  })
                }
              >
                <option value="" className="bg-ink-900">Escolha um item…</option>
                {contentOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-ink-900">
                    {option.label}
                  </option>
                ))}
              </select>
              {!contentOptions.some((o) => o.value === drop.item) && (
                <TextField
                  value={drop.item}
                  onChange={(item) =>
                    onChange({ drops: entity.drops.map((d) => (d.id === drop.id ? { ...d, item } : d)) })
                  }
                  placeholder="forge:rubi"
                  maxLength={96}
                />
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Mínimo">
                  <NumberField
                    value={drop.min}
                    min={0}
                    max={64}
                    onChange={(min) =>
                      onChange({ drops: entity.drops.map((d) => (d.id === drop.id ? { ...d, min } : d)) })
                    }
                  />
                </Field>
                <Field label="Máximo">
                  <NumberField
                    value={drop.max}
                    min={0}
                    max={64}
                    onChange={(max) =>
                      onChange({ drops: entity.drops.map((d) => (d.id === drop.id ? { ...d, max } : d)) })
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary w-full py-2 text-xs"
          onClick={() =>
            onChange({
              drops: [
                ...entity.drops,
                {
                  id: Math.random().toString(36).slice(2, 12),
                  item: contentOptions[0]?.value ?? '',
                  min: 1,
                  max: 1,
                  chance: 100,
                },
              ],
            })
          }
        >
          + Adicionar drop
        </button>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Receita                                                              */
/* ------------------------------------------------------------------ */

export function RecipeForm({
  recipe,
  namespace,
  onChange,
  contentOptions,
}: {
  recipe: RecipeDef
  namespace: string
  onChange: (patch: Partial<RecipeDef>) => void
  contentOptions: { value: string; label: string }[]
}) {
  const [customResult, setCustomResult] = useState('')
  const resultOptions = contentOptions.map((o) => o.value)
  const usesCustomResult = recipe.result && !resultOptions.includes(recipe.result)

  const VANILLA = [
    'minecraft:diamond', 'minecraft:iron_ingot', 'minecraft:gold_ingot', 'minecraft:stick',
    'minecraft:stone', 'minecraft:cobblestone', 'minecraft:coal', 'minecraft:redstone',
    'minecraft:iron_ore', 'minecraft:gold_ore', 'minecraft:wooden_planks', 'minecraft:leather',
    'minecraft:string', 'minecraft:apple', 'minecraft:bread', 'minecraft:bone', 'minecraft:wheat',
    'minecraft:emerald', 'minecraft:netherite_ingot', 'minecraft:lapis_lazuli',
  ]

  const ingredientOptions = [
    ...contentOptions,
    ...VANILLA.map((value) => ({ value, label: value })),
    { value: 'tag:minecraft:planks', label: 'tag: qualquer tábua' },
    { value: 'tag:minecraft:logs', label: 'tag: qualquer tronco' },
    { value: 'tag:minecraft:coals', label: 'tag: qualquer carvão' },
  ]

  function setPatternCell(row: number, col: number, char: string) {
    const pattern = [...recipe.pattern] as [string, string, string]
    const line = (pattern[row] ?? '').padEnd(3, ' ').split('')
    line[col] = char || ' '
    pattern[row] = line.join('').replace(/\s+$/, '')
    onChange({ pattern })
  }

  return (
    <div className="space-y-4">
      <Section title="Receita">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Identificador" hint={`Vai virar ${namespace}:${recipe.key || 'receita'}`}>
            <TextField value={recipe.key} onChange={(key) => onChange({ key })} />
          </Field>
          <Field label="Tipo">
            <SelectField
              value={recipe.type}
              onChange={(type) => onChange({ type })}
              options={[
                { value: 'shaped', label: 'Com molde (3x3)' },
                { value: 'shapeless', label: 'Sem molde' },
                { value: 'furnace', label: 'Fornalha' },
              ]}
            />
          </Field>
        </div>

        <Field label="Estações de crafting">
          <div className="flex flex-wrap gap-2">
            {TAGS_OPTIONS.map((tag) => {
              const active = recipe.tags.includes(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      tags: active ? recipe.tags.filter((t) => t !== tag.value) : [...recipe.tags, tag.value],
                    })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? 'border-grass-500/50 bg-grass-500/15 text-grass-300'
                      : 'border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      <Section title="Resultado">
        <Field label="Item produzido">
          <select
            className="input"
            value={usesCustomResult ? '__custom' : recipe.result}
            onChange={(e) => {
              if (e.target.value === '__custom') {
                setCustomResult(recipe.result)
                onChange({ result: '' })
              } else {
                onChange({ result: e.target.value })
              }
            }}
          >
            <option value="" className="bg-ink-900">Escolha…</option>
            {contentOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-ink-900">
                {option.label}
              </option>
            ))}
            <option value="__custom" className="bg-ink-900">Outro (digitar identificador)</option>
          </select>
        </Field>
        {(usesCustomResult || (!recipe.result && customResult !== null)) && (
          <Field label="Identificador do resultado" hint="Ex.: forge:rubi ou minecraft:diamond">
            <TextField
              value={customResult || recipe.result}
              onChange={(value) => {
                setCustomResult(value)
                onChange({ result: value })
              }}
              maxLength={96}
            />
          </Field>
        )}
        <Field label="Quantidade produzida">
          <NumberField value={recipe.resultCount} min={1} max={64} onChange={(resultCount) => onChange({ resultCount })} />
        </Field>
      </Section>

      {recipe.type === 'shaped' ? (
        <Section title="Molde 3x3" hint="Clique numa célula e digite o símbolo do ingrediente. Espaço = vazio.">
          <div className="grid w-40 grid-cols-3 gap-1.5">
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => {
                const char = (recipe.pattern[row] ?? '').padEnd(3, ' ')[col] ?? ' '
                return (
                  <input
                    key={`${row}-${col}`}
                    className="h-12 w-full rounded-lg border border-white/10 bg-ink-950/60 text-center font-mono text-lg uppercase text-white focus:border-grass-500/60 focus:outline-none"
                    value={char === ' ' ? '' : char}
                    maxLength={1}
                    onChange={(e) => setPatternCell(row, col, e.target.value.toUpperCase())}
                    aria-label={`Linha ${row + 1}, coluna ${col + 1}`}
                  />
                )
              }),
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-400">Símbolos usados</p>
            {Array.from(new Set(recipe.pattern.join('').replace(/\s/g, '').split(''))).map((char) => (
              <div key={char} className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-ink-950/60 font-mono text-sm text-white">
                  {char}
                </span>
                <select
                  className="input flex-1"
                  value={recipe.keyMap[char] ?? ''}
                  onChange={(e) => onChange({ keyMap: { ...recipe.keyMap, [char]: e.target.value } })}
                >
                  <option value="" className="bg-ink-900">Escolha o item…</option>
                  {ingredientOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-ink-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section title={recipe.type === 'furnace' ? 'Ingrediente' : 'Ingredientes'}>
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={ingredient}
                onChange={(e) =>
                  onChange({ ingredients: recipe.ingredients.map((v, i) => (i === index ? e.target.value : v)) })
                }
              >
                <option value="" className="bg-ink-900">Escolha o item…</option>
                {ingredientOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-ink-900">
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10"
                onClick={() => onChange({ ingredients: recipe.ingredients.filter((_, i) => i !== index) })}
                disabled={recipe.ingredients.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary w-full py-2 text-xs"
            onClick={() => onChange({ ingredients: [...recipe.ingredients, ''] })}
            disabled={recipe.type === 'furnace' || recipe.ingredients.length >= 9}
          >
            + Adicionar ingrediente
          </button>
          {recipe.type === 'furnace' && (
            <Field label="Experiência ganha">
              <NumberField value={recipe.experience} min={0} max={1000} step={0.1} onChange={(experience) => onChange({ experience })} />
            </Field>
          )}
        </Section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mundo                                                                */
/* ------------------------------------------------------------------ */

export function WorldForm({
  world,
  onChange,
}: {
  world: WorldSettings
  onChange: (patch: Partial<WorldSettings>) => void
}) {
  return (
    <div className="space-y-4">
      <Section title="Geração do mundo" hint="Estas configurações vão no README do pacote e nos arquivos world_*_packs.json.">
        <Field label="Semente" hint="Deixe vazio para uma semente aleatória.">
          <TextField value={world.seed} onChange={(seed) => onChange({ seed })} maxLength={32} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Modo de jogo">
            <SelectField
              value={world.gamemode}
              onChange={(gamemode) => onChange({ gamemode })}
              options={[
                { value: 'survival', label: 'Sobrevivência' },
                { value: 'creative', label: 'Criativo' },
                { value: 'adventure', label: 'Aventura' },
              ]}
            />
          </Field>
          <Field label="Dificuldade">
            <SelectField
              value={world.difficulty}
              onChange={(difficulty) => onChange({ difficulty })}
              options={[
                { value: 'peaceful', label: 'Pacífico' },
                { value: 'easy', label: 'Fácil' },
                { value: 'normal', label: 'Normal' },
                { value: 'hard', label: 'Difícil' },
              ]}
            />
          </Field>
        </div>
        <Field label={`Distância de simulação — ${world.simulationDistance} chunks`}>
          <SliderField
            value={world.simulationDistance}
            min={1}
            max={16}
            step={1}
            onChange={(simulationDistance) => onChange({ simulationDistance })}
          />
        </Field>
      </Section>

      <Section title="Regras">
        <Toggle label="PvP" description="Jogadores podem se atacar." checked={world.pvp} onChange={(pvp) => onChange({ pvp })} />
        <Toggle label="Trapaças" description="Comandos liberados no mundo." checked={world.cheats} onChange={(cheats) => onChange({ cheats })} />
        <Toggle label="Gerar estruturas" checked={world.generateStructures} onChange={(generateStructures) => onChange({ generateStructures })} />
        <Toggle label="Manter inventário ao morrer" checked={world.keepInventory} onChange={(keepInventory) => onChange({ keepInventory })} />
      </Section>
    </div>
  )
}
