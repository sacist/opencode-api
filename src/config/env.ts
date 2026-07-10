import { z } from 'zod'
import 'dotenv/config'


const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('./data/dev.sqlite'),
  LOG_DIR: z.string().min(1).default('./logs'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  OPENCODE_GO_BASE_URL: z.string(),
  ADMIN_USERNAME: z.string(),
  ADMIN_PASSWORD: z.string()
})

export const env = envSchema.parse(process.env)
