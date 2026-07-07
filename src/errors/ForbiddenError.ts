import { BaseError } from '#classes/BaseError'

export class ForbiddenError extends BaseError {
  constructor(code = 'FORBIDDEN', text = 'Forbidden') {
    super(403, code, text)
  }
}
