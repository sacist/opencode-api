import { env, nodeEnv } from '#config/env'
import { app } from './app.js'
import { logger } from '#config/logger'
import { db } from '#config/db'
import { opencodeServer, initOpencode, registerOpencodeHealthCheck } from '#helpers/init-opencode.helper'

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT, env: nodeEnv }, 'server.started')
})


const shutdown = (signal: string) => {
  logger.info({ signal }, 'server.shutdown')
  server.close(() => {
    try {
      db.close()
      opencodeServer?.close()
    } catch (err) {
      logger.error({ err }, 'db.closeError')
    }
    logger.info('server.closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}

const init = () => {
  if (nodeEnv === 'auto') {
    logger.warn('Файл .env не был создан в корне проекта, используется стандартное env')
  }
  initOpencode()
  registerOpencodeHealthCheck()
}


process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

init()
