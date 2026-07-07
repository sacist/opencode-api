export interface IErrorData {
  [key: string]: unknown
}

export interface IErrorObject {
  code: string
  text: string
  data: IErrorData
}

export class BaseError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly text: string
  public readonly data: IErrorData

  constructor(statusCode: number, code: string, text: string, data: IErrorData = {}) {
    super(text)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.text = text
    this.data = data
    Error.captureStackTrace?.(this, this.constructor)
  }

  public toObject = (): IErrorObject => ({
    code: this.code,
    text: this.text,
    data: this.data
  })
}
