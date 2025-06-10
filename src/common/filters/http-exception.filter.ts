import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { isString } from "class-validator";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 如果是404错误，直接返回响应，不记录日志
    if (status === HttpStatus.NOT_FOUND) {
      response.status(status).json({
        code: status,
        message: "Not Found",
        data: null,
      });
      return;
    }

    // 其他错误正常记录日志
    // Logger.error(exception);
    const message1 = isString(exception?.response?.message)? exception?.response?.message:""
    const message2 = Array.isArray(exception?.response?.message)? exception?.response?.message[0]:""
    const message = message1
      || message2
      || exception.message
      || exception.toString()
      || "服务器内部错误";

    response.status(status).json({
      code: status,
      message: message,
      data: null,
    });
  }
}
