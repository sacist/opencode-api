import { usersRepository } from '#repositories/UsersRepository'
import { hashPassword } from '#helpers/password.helper'
import { ConflictError } from '#errors/ConflictError'
import { toUserPublic, UserRole, type IUserPublic } from '#modules/users/users.model'
import { createUserWorkspace } from '#helpers/workspace.helper'

class AuthService {
  public addUser = async (username: string, password: string): Promise<IUserPublic> => {
    const existing = usersRepository.findByUsername(username)
    if (existing) {
      throw new ConflictError('USER_EXISTS', 'user with this username already exists')
    }
    const hash = await hashPassword(password)
    const user = usersRepository.create({ username, password: hash, role: UserRole.USER })
    createUserWorkspace(username)
    return toUserPublic(user)
  }
}

export const authService = new AuthService()
