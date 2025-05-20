import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = LoggerService.getInstance();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const startTime = Date.now();

    const logInfo: any = {
      method,
      url,
      body,
      query,
      params,
      timestamp: new Date().toISOString(),
      requestId: request.id || Math.random().toString(36).substring(7),
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };

    if (url.startsWith('/proxy')) {
      logInfo.targetUrl = request.headers['x-target-url'];
    }

    this.logger.info(`[请求开始] ${method} ${url}`, logInfo);

    return next.handle()
  }
}
