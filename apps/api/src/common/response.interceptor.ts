import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess } from '@whenwe/types';
import { SKIP_ENVELOPE } from './skip-envelope.decorator';

// 컨트롤러 반환값을 공통 성공 봉투 { success:true, data, error:null } 로 감싼다.
// @SkipEnvelope() 가 붙은 핸들러는 반환값을 그대로 통과시킨다(예: text/calendar).
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccess<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        error: null,
      })),
    );
  }
}
