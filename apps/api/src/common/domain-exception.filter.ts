import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiFailure, ErrorCode } from '@whenwe/types';
import { DomainException } from './domain-exception';

// 던져진 예외를 공통 실패 봉투 { success:false, data:null, error:{ code, message } } 로 변환한다.
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    // DomainException 은 ErrorCode 를, 그 외(HttpException/미상)는 도메인 외 sentinel 코드를 담는다.
    let code = 'INTERNAL_ERROR';
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
      code = 'HTTP_ERROR';
    } else {
      this.logger.error(exception);
    }

    const body: ApiFailure = {
      success: false,
      data: null,
      error: { code: code as ErrorCode, message },
    };

    response.status(httpStatus).json(body);
  }
}
