import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@whenwe/types';
import { DomainException } from '../common/domain-exception';
import type { JwtPayload } from './jwt-auth.guard';

// 선택적 Bearer 인증 헬퍼 — 초대 참여 등록·가능시간 제출처럼 "로그인했으면 회원,
// 아니면 비회원"으로 분기하는 공개 엔드포인트가 공유한다.
//
// - Authorization 헤더가 없거나 Bearer 형식이 아니면 null(비회원 경로).
// - Bearer 토큰이 있는데 검증 실패(만료·위조)면 401 — 조용히 비회원으로 강등하지 않는다
//   (클라이언트가 인증을 의도했으므로 재로그인/토큰 제거를 유도).
export async function resolveOptionalUserId(
  jwtService: JwtService,
  authHeader: string | undefined,
): Promise<number | null> {
  if (!authHeader) {
    return null;
  }
  const [scheme, value] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !value) {
    return null;
  }
  try {
    const payload = await jwtService.verifyAsync<JwtPayload>(value);
    return payload.sub;
  } catch {
    throw new DomainException(
      ErrorCode.UNAUTHENTICATED,
      HttpStatus.UNAUTHORIZED,
      '인증이 필요합니다.',
    );
  }
}
