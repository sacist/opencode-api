import { db } from '#config/db'
import { logger } from '#config/logger'
import { usersRepository } from '#repositories/UsersRepository'
import { hashPassword } from '#helpers/password.helper'
import { toUserPublic, UserRole } from '#modules/users/users.model'
import { initWorkspacesDir } from "#helpers/workspace.helper";

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '1221'

const main = async () => {
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