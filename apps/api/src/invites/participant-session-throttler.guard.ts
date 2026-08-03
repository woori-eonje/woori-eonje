import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ErrorCode } from '@whenwe/types';
import { DomainException } from '../common/domain-exception';

// participantSession(닉네임+PIN 재접속)의 IP 단위 레이트리밋 전용 가드.
// 기본 ThrottlerGuard 는 한도 초과 시 일반 HttpException(429)을 던지는데,
// DomainExceptionFilter 는 이를 DomainException 이 아니면 INTERNAL_ERROR 로 뭉개버린다.
// throwThrottlingException 을 오버라이드해 계약대로 PARTICIPANT_LOGIN_RATE_LIMITED 를 던진다.
@Injectable()
export class ParticipantSessionThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new DomainException(
      ErrorCode.PARTICIPANT_LOGIN_RATE_LIMITED,
      HttpStatus.TOO_MANY_REQUESTS,
      '잠시 후 다시 시도해 주세요.',
    );
  }
}
