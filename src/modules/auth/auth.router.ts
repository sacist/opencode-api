import { Router } from 'express'
import { authController } from './auth.controller.js'
import { authMiddleware } from '#middleware/auth.middleware'
import { requireRole } from '#middleware/require-role.middleware'
import { UserRole } from '#modules/users/users.model'

export const authRouter = Router()

authRouter.post('/add', authMiddleware, requireRole(UserRole.ADMIN), authController.addUser)
