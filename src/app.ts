import express from 'express'
import { healthRouter } from '#modules/health/health.router'
import { authRouter } from '#modules/auth/auth.router'
import { errorsMiddleware } from '#middleware/errors.middleware'

export const app = express()

app.use(express.json())

app.use('/health', healthRouter)
app.use('/auth', authRouter)

app.use(errorsMiddleware)
