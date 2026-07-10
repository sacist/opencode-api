import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { env } from './env.js'
import { logger } from './logger.js'

const dbDir = path.dirname(env.DB_PATH)
if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new Database(env.DB_PATH)

db.pragma('foreign_keys = ON')

const CREATE_USERS_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`

db.exec(CREATE_USERS_SQL)

logger.info({ path: env.DB_PATH }, 'db.initialized')
