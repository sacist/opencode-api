import { z } from 'zod'
import { config as loadDotenv } from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'

const nodeEnv = process.env.NODE_ENV ?? 'development'
const envFile = nodeEnv === 'production' ? '.production.env' : `.${nodeEnv}.env`
const envPath = path.resolve(process.cwd(), envFile)
if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('./data/dev.sqlite'),
  LOG_DIR: z.string().min(1).default('./logs'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  OPENCODE_GO_BASE_URL: z.string()
})

export const env = envSchema.parse(process.env)
