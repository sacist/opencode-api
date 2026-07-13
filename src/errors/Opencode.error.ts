import { BaseError } from '#classes/BaseError'
import { IErrorData } from '#classes/BaseError'

export class OpencodeError extends BaseError {
    constructor(code: string, text: string, data?: IErrorData) {
        super(500, code, text, data)
    }
}
