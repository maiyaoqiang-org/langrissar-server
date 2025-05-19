import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        // 文件输出，按日期轮转
        new winston.transports.DailyRotateFile({
          filename: 'logs/http-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '7d', // 保留7天的日志
          maxSize: '20m', // 每个文件最大20MB
          zippedArchive: true, // 压缩旧日志文件
        })
      ]
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;

    const logInfo: any = {
      body,
      query,
      params,
    };

    if (url.startsWith('/proxy')) {
      logInfo.targetUrl = request.headers['x-target-url'];
    }

    this.logger.info(`[请求] ${method} ${url}`, logInfo);
    return next.handle();
  }
}
