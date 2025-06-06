import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { LoggerService } from '../services/logger.service';
import { inspect } from "util";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = LoggerService.getInstance();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const startTime = Date.now();
    const logInfo: any = {
      body,
      query,
      params,
    };

    if (url.startsWith('/proxy')) {
      logInfo.targetUrl = request.headers['x-target-url'];
    }

    this.logger.info(`[请求开始] ${method} ${url}\n`+ inspect(logInfo,{depth:2}));

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.info(`[请求完成] ${method} ${url}\n` + inspect({
            ...logInfo,
            duration,
            status: 'success',
            responseData: data,
          },{depth:4}));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`[请求失败] ${method} ${url}\n`+ inspect({
            ...logInfo,
            duration,
            status: 'error',
            error: {
              message: error.message,
              stack: error.stack,
              code: error.code || error.status,
            },
          },{depth:3}));
        },
      })
    );
  }
}
