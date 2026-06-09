import { ErrorCode } from '@whenwe/types';

// 서비스 레이어가 던지는 도메인 예외.
// 전역 DomainExceptionFilter 가 { success:false, data:null, error:{ code, message } } 봉투로 변환한다.
export class DomainException extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
