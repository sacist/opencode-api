import { BaseError } from '#classes/BaseError'

export class UnauthorizedError extends BaseError {
  constructor(code = 'UNAUTHORIZED', text = 'Unauthorized') {
    super(401, code, text)
  }
}
