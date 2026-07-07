import { app } from './app.js'
import { env } from '#config/env'
import { logger } from '#config/logger'
import { db } from '#config/db'
import { initOpencode } from '#helpers/init-opencode.helper'

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server.started')
})
initOpencode()

const shutdown = (signal: string) => {
  logger.info({ signal }, 'server.shutdown')
  server.close(() => {
    try {
      db.close()
    } catch (err) {
      logger.error({ err }, 'db.closeError')
    }
    logger.info('server.closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
