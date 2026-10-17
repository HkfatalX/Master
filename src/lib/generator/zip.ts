import JSZip from 'jszip'
import type { PackFile } from './pack'

/**
 * Empacotamento dos arquivos gerados.
 *
 * - `.mcaddon` = zip com as pastas do behavior pack e do resource pack na raiz
 *   (é exatamente o que o Minecraft Bedrock espera para importar).
 * - `.zip`     = mesmo conteúdo, para quem prefere descompactar e editar.
 */

export async function zipPack(
  files: PackFile[],
  options: { root?: string } = {},
): Promise<Buffer> {
  const zip = new JSZip()
  const root = options.root ?? ''

  for (const file of files) {
    zip.file(`${root}${file.path}`, file.content)
  }

  // Arquivo de cortesia: identifica a origem e a versão alvo.
  zip.file(
    `${root}CRAFTFORGE.txt`,
    [
      'Gerado pelo CraftForge — criador de addons para Minecraft Bedrock.',
      `Arquivos: ${files.length}`,
      `Gerado em: ${new Date().toISOString()}`,
      '',
      'Dica: renomeie o .zip para .mcaddon antes de abrir no Minecraft,',
      'ou use o botão de download que já entrega o .mcaddon pronto.',
    ].join('\n'),
  )

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/** Nome de arquivo seguro para download. */
export function safeFileName(name: string, extension: string): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 48) || 'craftforge'
  return `${base}.${extension}`
}
