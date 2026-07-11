import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const OpencodeConfigSchema = z.object({
  $schema: z.string().optional(),
  provider: z.object({
    'opencode-go': z.object({
      name: z.string().optional(),
      options: z.object({
        apiKey: z.string()
      }),
    }),
  }),
})

export type OpencodeConfig = z.infer<typeof OpencodeConfigSchema>

export const OPENCODE_CONFIG_PATH = path.resolve(process.cwd(), '.opencode', 'opencode.json')

export const opencodeConfigExists = (): boolean => fs.existsSync(OPENCODE_CONFIG_PATH)

export const isOpencodeConfigValid = (): boolean => {
  if (!opencodeConfigExists()) return false
  try {
    const raw = fs.readFileSync(OPENCODE_CONFIG_PATH, 'utf-8')
    OpencodeConfigSchema.parse(JSON.parse(raw))
    return true
  } catch {
    return false
  }
}

export const loadOpencodeConfig = (): OpencodeConfig => {
  if (!fs.existsSync(OPENCODE_CONFIG_PATH)) {
    throw new Error(`opencode.json not found at ${OPENCODE_CONFIG_PATH}`)
  }
  const raw = fs.readFileSync(OPENCODE_CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw)
  return OpencodeConfigSchema.parse(parsed)
}

export const writeOpencodeConfig = (config: OpencodeConfig): void => {
  fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export const updateOpencodeGoApiKey = (apiKey: string): OpencodeConfig => {
  const config = loadOpencodeConfig()
  config.provider['opencode-go'].options.apiKey = apiKey
  writeOpencodeConfig(config)
  return config
}
