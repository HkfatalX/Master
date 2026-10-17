import crypto from 'node:crypto'
import { verifyPassword } from './auth'

/**
 * Hash fictício válido usado quando o usuário não existe.
 * Assim o tempo de resposta de "e-mail não cadastrado" é igual ao de
 * "senha errada" — sem isso, o endpoint vira um oráculo de enumeração.
 */
export const DUMMY_HASH = `scrypt$16384$8$1$${'A'.repeat(22)}==$${'A'.repeat(86)}==`

/** Verifica senha gastando o mesmo tempo independente da conta existir. */
export function verifyPasswordConstantTime(password: string, hash: string | undefined): boolean {
  return verifyPassword(password, hash ?? DUMMY_HASH)
}

/** Gera IDs curtos e imprevisíveis. */
export function uid(prefix = ''): string {
  const bytes = crypto.randomBytes(12)
  const hex = bytes.toString('hex')
  return prefix ? `${prefix}_${hex}` : hex
}
