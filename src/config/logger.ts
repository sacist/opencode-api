import pino from 'pino'
import path from 'node:path'
import fs from 'node:fs'
import { env } from './env.js'

if (!fs.existsSync(env.LOG_DIR)) {
  fs.mkdirSync(env.LOG_DIR, { recursive: true })
}

const targets: pino.TransportTargetOptions[] = [
  {
    target: 'pino-roll',
    options: {
      file: path.join(env.LOG_DIR, 'app.log'),
      frequency: 'daily',
      mkdir: true,
      limit: { count: 14 }
    },
    level: 'error'
  },
  {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l' },
    level: 'debug'
  }
]


const transport = pino.transport({ targets })

export const logger = pino(transport)
