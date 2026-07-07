import { BaseRepository } from '#classes/BaseRepository'
import type { IUser } from '#modules/users/users.model'

class UsersRepository extends BaseRepository<IUser> {
  constructor() {
    super('users')
  }

  public findByUsername = (username: string): IUser | null => this.findOne({ username })
}

export const usersRepository = new UsersRepository()
