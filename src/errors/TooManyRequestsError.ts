import { BaseError } from '#classes/BaseError'

export class TooManyRequestsError extends BaseError {
  constructor(code = 'TOO_MANY_REQUESTS', text = 'Too many requests') {
    super(429, code, text)
  }
}
