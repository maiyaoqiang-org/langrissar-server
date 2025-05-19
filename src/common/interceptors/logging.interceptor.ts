import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;

    // 打印请求信息
    const logInfo: any = {
      body,
      query,
      params,
    };

    // 如果是 proxy 接口，额外打印 x-target-url
    if (url.startsWith('/proxy')) {
      logInfo.targetUrl = request.headers['x-target-url'];
    }

    this.logger.log(`[请求] ${method} ${url}`, logInfo);
    return next.handle();
  }
}
