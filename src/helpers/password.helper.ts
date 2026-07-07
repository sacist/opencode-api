import bcrypt from 'bcrypt'
import { env } from '#config/env'

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
}

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash)
}
