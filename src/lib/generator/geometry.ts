import { FORMAT_VERSIONS, shortName } from '../minecraft'
import type { UvRect } from '../texture'

/**
 * Geometrias geradas pelo CraftForge.
 *
 * Dois sabores:
 *  - `buildBlockGeometry`: cubo com UV por face (textura 16x16) — usado em
 *    blocos; funciona para cubo cheio (16), laje (8) e camada (4).
 *  - `buildCreatureGeometry`: quadrúpede blocudo com UV "box_uv" empacotado
 *    automaticamente, mais os retângulos para pintar a textura.
 */

export type Cube = {
  origin: [number, number, number]
  size: [number, number, number]
  uv: [number, number]
  box_uv?: boolean
  inflate?: number
}

export type Bone = {
  name: string
  parent?: string
  pivot: [number, number, number]
  rotation?: [number, number, number]
  cubes: Cube[]
}

export type GeometryFile = {
  format_version: string
  'minecraft:geometry': {
    description: {
      identifier: string
      texture_width: number
      texture_height: number
      visible_bounds_width: number
      visible_bounds_height: number
      visible_bounds_offset: [number, number, number]
    }
    bones: Bone[]
  }[]
}

/* ------------------------------------------------------------------ */
/* Blocos                                                               */
/* ------------------------------------------------------------------ */

function face(w: number, h: number) {
  return { uv: [0, 0], uv_size: [w, h] }
}

export function buildBlockGeometry(identifier: string, height: number): GeometryFile {
  const short = shortName(identifier)
  const h = height
  const g = `geometry.${short}`

  return {
    format_version: FORMAT_VERSIONS.geometry,
    'minecraft:geometry': [
      {
        description: {
          identifier: g,
          texture_width: 16,
          texture_height: 16,
          visible_bounds_width: 2,
          visible_bounds_height: 2.5,
          visible_bounds_offset: [0, 0.75, 0],
        },
        bones: [
          {
            name: 'block',
            pivot: [0, 0, 0],
            cubes: [
              {
                origin: [-8, 0, -8],
                size: [16, h, 16],
                uv: {
                  north: face(16, h),
                  south: face(16, h),
                  east: face(16, h),
                  west: face(16, h),
                  up: face(16, 16),
                  down: face(16, 16),
                },
              } as unknown as Cube,
            ],
          },
        ],
      },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Criaturas                                                            */
/* ------------------------------------------------------------------ */

type RawCube = { name: string; origin: [number, number, number]; size: [number, number, number]; pivot: [number, number, number] }

/** Esqueleto de um quadrúpede blocudo (6 cubos). */
function creatureSkeleton(scale: number): RawCube[] {
  const s = Math.max(0.25, Math.min(3, scale))
  const m = (v: number) => Number((v * s).toFixed(3))
  return [
    { name: 'body', origin: [m(-5), m(8), m(-3)], size: [m(10), m(6), m(6)], pivot: [0, m(8), 0] },
    { name: 'head', origin: [m(-3), m(14), m(-6)], size: [m(6), m(6), m(6)], pivot: [0, m(14), m(-6)] },
    { name: 'leg_front_left', origin: [m(-5), 0, m(-3)], size: [m(3), m(8), m(3)], pivot: [m(-3.5), m(8), m(-1.5)] },
    { name: 'leg_front_right', origin: [m(2), 0, m(-3)], size: [m(3), m(8), m(3)], pivot: [m(3.5), m(8), m(-1.5)] },
    { name: 'leg_back_left', origin: [m(-5), 0, 0], size: [m(3), m(8), m(3)], pivot: [m(-3.5), m(8), m(1.5)] },
    { name: 'leg_back_right', origin: [m(2), 0, 0], size: [m(3), m(8), m(3)], pivot: [m(3.5), m(8), m(1.5)] },
  ]
}

export type CreatureGeometry = {
  file: GeometryFile
  rects: UvRect[]
  textureSize: { width: number; height: number }
}

/** Empacota os retângulos de UV no layout box_uv do Bedrock. */
function packBoxUv(cubes: RawCube[], maxWidth = 64): { positions: Map<string, [number, number]>; height: number; width: number } {
  const positions = new Map<string, [number, number]>()
  let x = 0
  let y = 0
  let rowHeight = 0
  let maxX = 0

  for (const cube of cubes) {
    const w = Math.round(2 * (cube.size[0] + cube.size[2]))
    const h = Math.round(cube.size[1] + cube.size[2])
    if (x > 0 && x + w > maxWidth) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }
    positions.set(cube.name, [x, y])
    x += w
    rowHeight = Math.max(rowHeight, h)
    maxX = Math.max(maxX, x)
  }

  return { positions, height: y + rowHeight, width: maxX }
}

export function buildCreatureGeometry(identifier: string, scale = 1): CreatureGeometry {
  const short = shortName(identifier)
  const cubes = creatureSkeleton(scale)
  const { positions, height, width } = packBoxUv(cubes)

  // Textura sempre em múltiplos de 16 (mipmapping feliz).
  const texWidth = Math.max(16, Math.min(128, Math.ceil(width / 16) * 16))
  const texHeight = Math.max(16, Math.min(128, Math.ceil(height / 16) * 16))

  const rects: UvRect[] = cubes.map((cube) => {
    const [u, v] = positions.get(cube.name) ?? [0, 0]
    return {
      name: cube.name,
      x: u,
      y: v,
      w: Math.round(2 * (cube.size[0] + cube.size[2])),
      h: Math.round(cube.size[1] + cube.size[2]),
    }
  })

  const bones: Bone[] = cubes.map((cube) => ({
    name: cube.name,
    ...(cube.name === 'head' ? { parent: 'body' } : {}),
    pivot: cube.pivot,
    cubes: [
      {
        origin: cube.origin,
        size: cube.size,
        uv: positions.get(cube.name) ?? [0, 0],
        box_uv: true,
      },
    ],
  }))

  const tallest = Math.max(...cubes.map((c) => c.origin[1] + c.size[1]))

  return {
    rects,
    textureSize: { width: texWidth, height: texHeight },
    file: {
      format_version: FORMAT_VERSIONS.geometry,
      'minecraft:geometry': [
        {
          description: {
            identifier: `geometry.${short}`,
            texture_width: texWidth,
            texture_height: texHeight,
            visible_bounds_width: 3,
            visible_bounds_height: Math.max(2, Math.ceil(tallest / 8) + 1),
            visible_bounds_offset: [0, Math.max(1, tallest / 16), 0],
          },
          bones,
        },
      ],
    },
  }
}
