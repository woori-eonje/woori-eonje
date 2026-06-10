import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  type ApiFailure,
  type ErrorCode,
  ErrorCode as Codes,
} from '@whenwe/types';
import { DomainException } from './domain-exception';

// 던져진 예외를 공통 실패 봉투 { success:false, data:null, error:{ code, message } } 로 변환한다.
// 나가는 code 는 항상 계약(@whenwe/types ErrorCode) 에 선언된 값이다:
//  - DomainException → 그 도메인 코드
//  - HttpException 400(입력 검증) → VALIDATION_ERROR
//  - 그 외 HttpException / 미분류 예외 → INTERNAL_ERROR
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = Codes.INTERNAL_ERROR;
    let message = '서버 오류가 발생했습니다.';

    if (exception instanceof DomainException) {
      httpStatus = exception.httpStatus;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      const raw: string | string[] =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ??
            exception.message);
      message = Array.isArray(raw) ? raw.join(', ') : raw;
      code =
        httpStatus === HttpStatus.BAD_REQUEST
          ? Codes.VALIDATION_ERROR
          : Codes.INTERNAL_ERROR;
    } else {
      this.logger.error(exception);
    }

    const body: ApiFailure = {
      success: false,
      data: null,
      error: { code, message },
    };

    response.status(httpStatus).json(body);
  }
}
