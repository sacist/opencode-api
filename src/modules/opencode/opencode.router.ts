import { Router } from 'express'
import { opencodeController } from './opencode.controller.js'
import { authMiddleware } from '#middleware/auth.middleware'
import { requireRole } from '#middleware/require-role.middleware'
import { UserRole } from '#modules/users/users.model'

export const opencodeRouter = Router()

opencodeRouter.post('/agent', authMiddleware, opencodeController.agent)
opencodeRouter.post('/api', authMiddleware, opencodeController.api)
opencodeRouter.post('/agent/md', authMiddleware, opencodeController.agentMD)
opencodeRouter.post('/api-key', authMiddleware, requireRole(UserRole.ADMIN), opencodeController.updateApiKey)