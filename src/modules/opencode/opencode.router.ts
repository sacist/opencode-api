import { Router } from 'express'
import { opencodeController } from './opencode.controller.js'
import { authMiddleware } from '#middleware/auth.middleware'

export const opencodeRouter = Router()

opencodeRouter.post('/agent', authMiddleware, opencodeController.agent)
opencodeRouter.post('/api', authMiddleware, opencodeController.api)