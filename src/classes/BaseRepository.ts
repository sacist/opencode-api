import { db } from '#config/db'
import { randomUUID } from 'crypto'

export interface IBaseEntity {
  id: string
  created_at: number
  updated_at: number
}

export type EntityInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type EntityUpdate<T> = Partial<EntityInput<T>>

export class BaseRepository<T extends IBaseEntity> {
  protected readonly tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  public findById = (id: string): T | null => {
    const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as T | undefined
    return row ?? null
  }

  public findOne = (where: Record<string, unknown>): T | null => {
    const keys = Object.keys(where)
    if (keys.length === 0) return null
    const sql = `SELECT * FROM ${this.tableName} WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')} LIMIT 1`
    const row = db.prepare(sql).get(...keys.map((k) => where[k])) as T | undefined
    return row ?? null
  }

  public findAll = (where: Record<string, unknown> = {}): T[] => {
    const keys = Object.keys(where)
    if (keys.length === 0) {
      return db.prepare(`SELECT * FROM ${this.tableName}`).all() as T[]
    }
    const sql = `SELECT * FROM ${this.tableName} WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')}`
    return db.prepare(sql).all(...keys.map((k) => where[k])) as T[]
  }

  public create = (data: EntityInput<T>): T => {
    const now = Date.now()
    const id = randomUUID()
    const row = { ...(data as object), id, created_at: now, updated_at: now } as unknown as T
    const keys = Object.keys(row)
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`
    db.prepare(sql).run(...keys.map((k) => (row as Record<string, unknown>)[k]))
    return row
  }

  public update = (id: string, data: EntityUpdate<T>): T | null => {
    const now = Date.now()
    const updates: Record<string, unknown> = { ...(data as object), updated_at: now }
    const keys = Object.keys(updates)
    if (keys.length === 0) return this.findById(id)
    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`
    db.prepare(sql).run(...keys.map((k) => updates[k]), id)
    return this.findById(id)
  }

  public delete = (id: string): boolean => {
    const result = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id)
    return result.changes > 0
  }
}
