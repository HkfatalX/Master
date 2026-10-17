import zlib from 'node:zlib'

/**
 * Codificador PNG mínimo (RGBA8, sem dependências).
 * Usado para gerar texturas e ícones de pack quando o usuário não envia imagem.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** `rgba` deve ter exatamente width * height * 4 bytes. */
export function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  if (rgba.length !== width * height * 4) {
    throw new Error(`encodePNG: esperado ${width * height * 4} bytes, recebeu ${rgba.length}`)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  // Cada scanline é precedida pelo byte de filtro (0 = None).
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const srcStart = y * width * 4
    const dstStart = y * (width * 4 + 1)
    raw[dstStart] = 0
    rgba.copy(raw, dstStart + 1, srcStart, srcStart + width * 4)
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export type RGBA = [number, number, number, number]

/** Surface RGBA com helpers de pintura. */
export class Canvas {
  readonly width: number
  readonly height: number
  readonly data: Buffer

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = Buffer.alloc(width * height * 4, 0)
  }

  set(x: number, y: number, [r, g, b, a]: RGBA): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    this.data[i] = clamp255(r)
    this.data[i + 1] = clamp255(g)
    this.data[i + 2] = clamp255(b)
    this.data[i + 3] = clamp255(a)
  }

  /** Pinta um retângulo, opcionalmente por função de pixel. */
  rect(
    x0: number,
    y0: number,
    w: number,
    h: number,
    paint: (x: number, y: number, lx: number, ly: number) => RGBA,
  ): void {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue
        this.set(x, y, paint(x, y, x - x0, y - y0))
      }
    }
  }

  toPNG(): Buffer {
    return encodePNG(this.width, this.height, this.data)
  }

  toDataURL(): string {
    return `data:image/png;base64,${this.toPNG().toString('base64')}`
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

/* ------------------------------------------------------------------ */
/* Cor                                                                  */
/* ------------------------------------------------------------------ */

export type HSL = { h: number; s: number; l: number }

export function hslToRgb({ h, s, l }: HSL): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = Number.parseInt(full || '000000', 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`
}

/** PRNG determinístico — mesma semente, mesma textura. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Converte data URL / base64 em Buffer PNG. */
export function decodeDataImage(value: string): Buffer | null {
  try {
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(value.trim())
    const b64 = match ? match[1] : value.trim()
    const buf = Buffer.from(b64, 'base64')
    if (buf.length < 8) return null
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    return isPng ? buf : null
  } catch {
    return null
  }
}
