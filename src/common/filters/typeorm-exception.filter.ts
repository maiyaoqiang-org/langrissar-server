import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let message = `数据库操作失败：${exception.message}`;
    const code = (exception as any).errno || 500;

    // Logger.error(exception);
    // MySQL 错误码处理
    // switch ((exception as any).code) {
    //   case 'ER_DUP_ENTRY':
    //     message = '数据已存在';
    //     break;
    //   case 'ER_NO_REFERENCED_ROW':
    //     message = '关联数据不存在';
    //     break;
    //   default:
    //     message = exception.message;
    // }

    response.status(400).json({
      code,
      message,
      data: null
    });
  }
}