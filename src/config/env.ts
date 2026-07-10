import { z } from 'zod'
import { config as loadDotenv } from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'


export enum NODE_ENV {
  AUTO = 'auto',
  PRODUCTION = 'production'
}

export let nodeEnv: NODE_ENV
let envFile

const dotEnvPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(dotEnvPath)) {
  nodeEnv = NODE_ENV.PRODUCTION
  envFile = '.env'
} else {
  nodeEnv = NODE_ENV.AUTO
  envFile = '.example.env'
}


const envPath = path.resolve(process.cwd(), envFile)

if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath })
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('./data/dev.sqlite'),
  LOG_DIR: z.string().min(1).default('./logs'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  OPENCODE_GO_BASE_URL: z.string(),
  OPENCODE_GO_API_KEY: z.string(),
  ADMIN_USERNAME: z.string(),
  ADMIN_PASSWORD: z.string()
})

export const env = envSchema.parse(process.env)
