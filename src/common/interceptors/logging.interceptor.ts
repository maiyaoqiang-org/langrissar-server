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
    // const now = Date.now();

    // 打印请求信息
    this.logger.log(`[请求] ${method} ${url}`, {
      body: body || {},
      query: query || {},
      params: params || {},
    });
    return next.handle();
    // return next.handle().pipe(
    //   tap({
    //     next: (data) => {
    //       // 打印响应信息
    //       this.logger.log(`[响应] ${method} ${url} ${Date.now() - now}ms`, {
    //         data,
    //       });
    //     },
    //     error: (error) => {
    //       // 打印错误信息
    //       this.logger.error(`[错误] ${method} ${url} ${Date.now() - now}ms`, {
    //         error: error.message,
    //         stack: error.stack,
    //       });
    //     },
    //   })
    // );
  }
}
