import { BaseError } from '#classes/BaseError'

export class NotFoundError extends BaseError {
  constructor(code = 'NOT_FOUND', text = 'Not found') {
    super(404, code, text)
  }
}
