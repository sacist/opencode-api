import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { ZodError, type ZodSchema } from 'zod'
import { ValidationError } from '#errors/ValidationError'

export interface IRequestSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export const run = (
  schemas: IRequestSchemas,
  handler: (req: Request, res: Response) => Promise<unknown>
): RequestHandler => async (req, res, next) => {
  try {
    const valid: { body?: unknown; query?: unknown; params?: unknown } = {}
    if (schemas.body) valid.body = schemas.body.parse(req.body)
    if (schemas.query) valid.query = schemas.query.parse(req.query)
    if (schemas.params) valid.params = schemas.params.parse(req.params)
    req.valid = valid
    const result = await handler(req, res)
    res.json({ success: true, data: result ?? null })
  } catch (err) {
    if (err instanceof ZodError) {
      return next(new ValidationError({ issues: err.issues }))
    }
    return next(err)
  }
}

export class BaseController {
  public run = run
}
