import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';

export interface Response<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const bypass = this.reflector.get<boolean>(BYPASS_TRANSFORM_KEY, context.getHandler());
    if (bypass) {
      return next.handle();
    }
    return next.handle().pipe(
      map(data => ({
        code: 0,
        data,
        message: '操作成功'
      }))
    );
  }
}