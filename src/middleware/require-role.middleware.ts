import type { Request, Response, NextFunction } from 'express'
import { ForbiddenError } from '#errors/ForbiddenError'
import { UserRole } from '#modules/users/users.model'

export const requireRole = (role: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return next(new ForbiddenError('FORBIDDEN_ROLE', 'insufficient role'))
    }
    next()
  }
}
