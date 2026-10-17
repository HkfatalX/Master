import { Canvas, hashString, hslToRgb, hexToRgb, mulberry32, type RGBA } from './png'

/**
 * Geração procedural de texturas.
 *
 * Quando o criador não envia uma imagem, o CraftForge desenha uma textura
 * determinística (mesma semente = mesmo resultado) para que o pack abra no
 * Minecraft sem nenhum arquivo quebrado.
 */

export type TextureKind = 'item' | 'block' | 'entity' | 'icon'

type Palette = { base: [number, number, number]; accent: [number, number, number] }

function palette(kind: TextureKind, hex: string | undefined, seed: string): Palette {
  const rand = mulberry32(hashString(seed))
  const base: [number, number, number] = hex && /^#[0-9a-fA-F]{6}$/.test(hex)
    ? hexToRgb(hex)
    : hslToRgb({ h: Math.floor(rand() * 360), s: 0.55 + rand() * 0.3, l: kind === 'block' ? 0.5 : 0.58 })
  const accent = hslToRgb({
    h: (Math.atan2(base[1] - 128, base[0] - 128) * 180) / Math.PI + 40,
    s: 0.6,
    l: 0.68,
  })
  return { base, accent }
}

function shade(color: [number, number, number], factor: number): RGBA {
  return [
    Math.min(255, Math.max(0, color[0] * factor)),
    Math.min(255, Math.max(0, color[1] * factor)),
    Math.min(255, Math.max(0, color[2] * factor)),
    255,
  ]
}

function noise(rand: () => number, amount: number): number {
  return 1 + (rand() - 0.5) * amount
}

/* ------------------------------------------------------------------ */
/* Itens                                                                */
/* ------------------------------------------------------------------ */

type ShapeId = 'gem' | 'ingot' | 'sword' | 'orb' | 'food' | 'tool' | 'disc' | 'plant'

const SHAPES: ShapeId[] = ['gem', 'ingot', 'sword', 'orb', 'food', 'tool', 'disc', 'plant']

function insideShape(shape: ShapeId, x: number, y: number): boolean {
  const dx = x - 7.5
  const dy = y - 7.5
  switch (shape) {
    case 'gem':
      return Math.abs(dx) + Math.abs(dy) <= 6.4 && Math.abs(dy) <= 6.4
    case 'ingot':
      return x >= 2 && x <= 13 && y >= 5 && y <= 10 && !(x <= 3 && y <= 6) && !(x >= 12 && y <= 6)
    case 'sword': {
      const onBlade = y >= 2 && y <= 10 && x >= 4 && x <= 11 && x - y >= -6 && x - y <= 4
      const onGuard = y >= 10 && y <= 11 && x >= 3 && x <= 12
      const onGrip = x >= 5 && x <= 6 && y >= 11 && y <= 14
      return onBlade || onGuard || onGrip
    }
    case 'orb':
      return dx * dx + dy * dy <= 42
    case 'food':
      return dx * dx + dy * dy <= 38 && !(y <= 4 && x >= 6 && x <= 9)
    case 'tool': {
      const head = y >= 3 && y <= 6 && ((x >= 1 && x <= 14) || (Math.abs(x - 7.5) <= 1.5 && y <= 8))
      const handle = x >= 7 && x <= 8 && y >= 5 && y <= 14
      return head || handle
    }
    case 'disc':
      return dx * dx + dy * dy <= 48 && dx * dx + dy * dy >= 3
    case 'plant': {
      const stem = x >= 7 && x <= 8 && y >= 6
      const leafA = x >= 3 && x <= 7 && y >= 4 && y <= 9
      const leafB = x >= 9 && x <= 13 && y >= 6 && y <= 11
      return stem || leafA || leafB
    }
    default:
      return true
  }
}

/** Ícone de item 16x16 com formato derivado do identificador. */
export function generateItemTexture(
  seed: string,
  color?: string,
  shape?: ShapeId,
): Buffer {
  const { base, accent } = palette('item', color, seed)
  const rand = mulberry32(hashString(`item:${seed}`))
  const chosen: ShapeId = shape ?? SHAPES[hashString(seed) % SHAPES.length]
  const canvas = new Canvas(16, 16)
  const outline: [number, number, number] = [
    base[0] * 0.42,
    base[1] * 0.42,
    base[2] * 0.42,
  ]

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!insideShape(chosen, x, y)) continue
      // Borda escura: pixel vizinho fora do formato.
      const isEdge =
        !insideShape(chosen, x - 1, y) ||
        !insideShape(chosen, x + 1, y) ||
        !insideShape(chosen, x, y - 1) ||
        !insideShape(chosen, x, y + 1)

      if (isEdge) {
        canvas.set(x, y, shade(outline, noise(rand, 0.12)))
        continue
      }

      // Luz vinda do canto superior esquerdo.
      const light = 1.25 - (x / 16) * 0.35 - (y / 16) * 0.45
      const highlight = x <= 8 && y <= 7 ? 1.18 : 1
      const c = shade(base, light * highlight * noise(rand, 0.16))
      const isAccentSpot = (x + y) % 7 === 0
      canvas.set(x, y, isAccentSpot ? shade(accent, light * highlight) : c)
    }
  }

  return canvas.toPNG()
}

/* ------------------------------------------------------------------ */
/* Blocos                                                               */
/* ------------------------------------------------------------------ */

/** Textura de bloco 16x16: ladrilho com ruído e junta escura (tileable). */
export function generateBlockTexture(seed: string, color?: string): Buffer {
  const { base } = palette('block', color, seed)
  const rand = mulberry32(hashString(`block:${seed}`))
  const canvas = new Canvas(16, 16)

  const speckles: { x: number; y: number; tone: number }[] = []
  const speckleCount = 10 + (hashString(seed) % 8)
  for (let i = 0; i < speckleCount; i++) {
    speckles.push({
      x: Math.floor(rand() * 16),
      y: Math.floor(rand() * 16),
      tone: 0.78 + rand() * 0.4,
    })
  }

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let factor = 1 + (rand() - 0.5) * 0.22
      // Junta nas bordas dá sensação de ladrilho e disfarça repetição.
      if (x === 0 || y === 0) factor *= 0.82
      if (x === 15 || y === 15) factor *= 0.9
      // Leve gradiente vertical.
      factor *= 1.08 - (y / 16) * 0.22

      for (const s of speckles) {
        if (s.x === x && s.y === y) factor *= s.tone
      }

      canvas.set(x, y, shade(base, factor))
    }
  }

  return canvas.toPNG()
}

/* ------------------------------------------------------------------ */
/* Entidades                                                            */
/* ------------------------------------------------------------------ */

export type UvRect = { x: number; y: number; w: number; h: number; name: string }

/**
 * Pinta a textura de uma entidade a partir dos retângulos calculados pelo
 * empacotador de UV (box_uv). Cada osso recebe uma cor própria.
 */
export function generateEntityTexture(
  seed: string,
  size: { width: number; height: number },
  rects: UvRect[],
  color?: string,
): Buffer {
  const canvas = new Canvas(size.width, size.height)
  const rand = mulberry32(hashString(`entity:${seed}`))
  const baseHex = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined

  rects.forEach((rect, index) => {
    const { base } = palette('entity', baseHex, `${seed}:${rect.name}:${index}`)
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (x < 0 || y < 0 || x >= size.width || y >= size.height) continue
        const lx = x - rect.x
        const ly = y - rect.y
        const border = lx === 0 || ly === 0 || lx === rect.w - 1 || ly === rect.h - 1
        let factor = 1.06 - (ly / Math.max(1, rect.h)) * 0.3 + (rand() - 0.5) * 0.12
        if (border) factor *= 0.7
        if (lx < rect.w * 0.28 && ly < rect.h * 0.3) factor *= 1.16
        canvas.set(x, y, shade(base, factor))
      }
    }
  })

  return canvas.toPNG()
}

/* ------------------------------------------------------------------ */
/* Ícone do pack                                                        */
/* ------------------------------------------------------------------ */

/** Ícone 64x64 estilizado (topo de grama + terra). */
export function generatePackIcon(seed: string, color?: string): Buffer {
  const { base } = palette('icon', color, seed)
  const rand = mulberry32(hashString(`icon:${seed}`))
  const canvas = new Canvas(64, 64)
  const grass: [number, number, number] = baseHexOr(color) ?? [96, 176, 72]
  const dirt: [number, number, number] = [122, 84, 56]

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (y < 12) {
        const f = 1.1 - (y / 12) * 0.2 + (rand() - 0.5) * 0.22
        canvas.set(x, y, shade(grass, f))
      } else {
        const f = 1 + (rand() - 0.5) * 0.3 - ((y - 12) / 52) * 0.25
        canvas.set(x, y, shade(dirt, f))
      }
    }
  }

  // Detalhe: alguns blocos de pedra para dar textura.
  for (let i = 0; i < 22; i++) {
    const bx = Math.floor(rand() * 56) + 4
    const by = Math.floor(rand() * 40) + 16
    canvas.rect(bx, by, 3, 3, () => shade(dirt, 1.25))
  }

  return canvas.toPNG()
}

function baseHexOr(color?: string): [number, number, number] | null {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? hexToRgb(color) : null
}
