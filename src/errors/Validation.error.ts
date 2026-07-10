import { BaseError, type IErrorData } from '#classes/BaseError'

export class ValidationError extends BaseError {
  constructor(data: IErrorData = {}) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', data)
  }
}
