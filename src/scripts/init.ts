import { db } from '#config/db'
import { logger } from '#config/logger'
import { usersRepository } from '#repositories/UsersRepository'
import { hashPassword } from '#helpers/password'
import { toUserPublic, UserRole } from '#modules/users/users.model'
import { initWorkspacesDir, createUserWorkspace } from "#helpers/workspace";
import { env } from '#config/env'
import { isOpencodeConfigValid, OPENCODE_CONFIG_PATH, writeOpencodeConfig, type OpencodeConfig } from '#helpers/opencode-config'

const ADMIN_USERNAME = env.ADMIN_USERNAME
const ADMIN_PASSWORD = env.ADMIN_PASSWORD

const seedOpencodeConfig = () => {
  if (isOpencodeConfigValid()) {
    logger.info({ path: OPENCODE_CONFIG_PATH }, 'init.opencodeConfigValid')
    return
  }

  const apiKey = env.OPENCODE_GO_API_KEY
  const baseURL = env.OPENCODE_GO_BASE_URL

  const cfg: OpencodeConfig = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      'opencode-go': {
        name: 'OpenCode Go',
        options: {
          apiKey,
          baseURL,
        },
      },
    },
  }

  writeOpencodeConfig(cfg)

  if (!apiKey) {
    logger.warn({ path: OPENCODE_CONFIG_PATH }, 'init.opencodeConfigCreatedEmptyKey')
  } else {
    logger.info({ path: OPENCODE_CONFIG_PATH }, 'init.opencodeConfigCreatedFromEnv')
  }
}

const main = async () => {
  seedOpencodeConfig()

  const existing = usersRepository.findByUsername(ADMIN_USERNAME)
  if (existing) {
    logger.info({ username: ADMIN_USERNAME }, 'init.adminExists')
  } else {
    const hash = await hashPassword(ADMIN_PASSWORD)
    const admin = usersRepository.create({ username: ADMIN_USERNAME, password: hash, role: UserRole.ADMIN })
    logger.info({ admin: toUserPublic(admin) }, 'init.adminCreated')
  }
  db.close()
}

main().catch((err) => {
  logger.error({ err }, 'init.failed')
  process.exit(1)
})

initWorkspacesDir()
createUserWorkspace(ADMIN_USERNAME)