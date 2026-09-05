/** 业务错误：message 可安全返回给客户端，默认 400 */
export class BizError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = "BizError"
    this.statusCode = statusCode
  }
}
