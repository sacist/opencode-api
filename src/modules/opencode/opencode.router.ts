import { Router } from 'express'
import { opencodeController } from './opencode.controller.js'
import { authMiddleware } from '#middleware/auth.middleware'

export const opencodeRouter = Router()

opencodeRouter.post('/prompt', authMiddleware, opencodeController.prompt)
