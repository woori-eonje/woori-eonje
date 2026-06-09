import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess } from '@whenwe/types';

// 컨트롤러 반환값을 공통 성공 봉투 { success:true, data, error:null } 로 감싼다.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccess<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        error: null,
      })),
    );
  }
}
