import express from 'express'
import { authRouter } from '#modules/auth/auth.router'
import { opencodeRouter } from '#modules/opencode/opencode.router'
import { errorsMiddleware } from '#middleware/errors.middleware'
import { ValidationError } from '#errors/Validation.error'

export const app = express()

app.use(express.json({
    limit: '30mb',
    verify: (__, _, buf, encoding: BufferEncoding) => {
        try {
            if (buf && buf.length) {
                JSON.parse(buf.toString(encoding || 'utf-8'))
            }
        } catch {
            throw new ValidationError({ reason: 'Вы прислали не валидный json' })
        }
    }
}))

app.use('/auth', authRouter)
app.use('/opencode', opencodeRouter)

app.use(errorsMiddleware)
