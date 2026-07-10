import { BaseError } from '#classes/BaseError'

export class ConflictError extends BaseError {
  constructor(code = 'CONFLICT', text = 'Conflict') {
    super(409, code, text)
  }
}
