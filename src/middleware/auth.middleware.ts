import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '#errors/UnauthorizedError'
import { usersRepository } from '#repositories/UsersRepository'
import { verifyPassword } from '#helpers/password.helper'

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const username = req.header('username')
    const password = req.header('password')
    if (!username || !password) {
      return next(new UnauthorizedError('AUTH_HEADERS_MISSING', 'username and password headers are required'))
    }
    const user = usersRepository.findByUsername(username)
    if (!user) {
      return next(new UnauthorizedError('AUTH_INVALID', 'invalid credentials'))
    }
    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return next(new UnauthorizedError('AUTH_INVALID', 'invalid credentials'))
    }
    req.user = { id: user.id, username: user.username, role: user.role }
    next()
  } catch (err) {
    next(err)
  }
}
