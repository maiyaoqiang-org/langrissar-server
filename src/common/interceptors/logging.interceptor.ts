import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = LoggerService.getInstance();

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

    this.logger.info(`[请求开始] ${method} ${url} ${JSON.stringify(logInfo)}`);

    return next.handle()
  }
}
