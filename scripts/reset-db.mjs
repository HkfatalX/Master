import fs from 'node:fs'
import path from 'node:path'

/**
 * Apaga o banco local. Uso: npm run db:reset
 * O datastore é recriado automaticamente na próxima requisição.
 */

const target =
  process.env.CRAFTFORGE_DB ?? path.join(process.cwd(), 'data', 'craftforge.db')

if (target === ':memory:') {
  console.log('CRAFTFORGE_DB=:memory: — nada a apagar.')
  process.exit(0)
}

let removed = 0
for (const suffix of ['', '-shm', '-wal']) {
  const file = `${target}${suffix}`
  if (fs.existsSync(file)) {
    fs.rmSync(file)
    removed++
    console.log(`removido: ${path.relative(process.cwd(), file)}`)
  }
}

console.log(removed ? 'Banco resetado.' : 'Nenhum arquivo de banco encontrado.')
