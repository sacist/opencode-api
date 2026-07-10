import express from 'express'
import { authRouter } from '#modules/auth/auth.router'
import { opencodeRouter } from '#modules/opencode/opencode.router'
import { errorsMiddleware } from '#middleware/errors.middleware'

export const app = express()

app.use(express.json())

app.use('/auth', authRouter)
app.use('/opencode', opencodeRouter)

app.use(errorsMiddleware)
