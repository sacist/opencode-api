import type { Request, Response, NextFunction } from 'express'
import { BaseError } from '#classes/BaseError'
import { logger } from '#config/logger'

export const errorsMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof BaseError) {
    if (err.statusCode >= 500) {
      logger.error({ err, originalUrl: req.originalUrl, code: err.code, text: err.text }, 'request.error')
    } else {
      logger.warn({ originalUrl: req.originalUrl, code: err.code, text: err.text }, 'request.clientError')
    }
    return res.status(err.statusCode).json(err.toObject())
  }
  const e = err as Error
  logger.error({ err: e, originalUrl: req.originalUrl }, 'request.unhandledError')
  return res.status(500).json({ code: 'INTERNAL_ERROR', text: 'Internal server error', data: {} })
}
