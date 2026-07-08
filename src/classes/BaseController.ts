import type { Request, Response, RequestHandler } from 'express'
import { ZodError, type ZodTypeAny, type z } from 'zod'
import { ValidationError } from '#errors/ValidationError'

export interface IRequestSchemas {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

type Infer<S extends ZodTypeAny | undefined> =
  S extends ZodTypeAny ? z.infer<S> : never

type Valid<S extends IRequestSchemas> = {
  body: Infer<S['body']>
  query: Infer<S['query']>
  params: Infer<S['params']>
}

export const run = <S extends IRequestSchemas>(
  schemas: S,
  handler: (req: Omit<Request, 'valid'> & { valid: Valid<S> }, res: Response) => Promise<unknown>
): RequestHandler => async (req, res, next) => {
  try {
    const valid: Valid<S> = {} as Valid<S>
    if (schemas.body) (valid as { body: unknown }).body = schemas.body.parse(req.body)
    if (schemas.query) (valid as { query: unknown }).query = schemas.query.parse(req.query)
    if (schemas.params) (valid as { params: unknown }).params = schemas.params.parse(req.params)
    ;(req as Request & { valid: Valid<S> }).valid = valid
    const result = await handler(req as Request & { valid: Valid<S> }, res)
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
