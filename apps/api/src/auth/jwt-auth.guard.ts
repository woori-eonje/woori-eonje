import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@whenwe/types';
import type { Request } from 'express';
import { DomainException } from '../common/domain-exception';
import { PrismaService } from '../prisma/prisma.service';

// JWT payload 의 형태(서명 시 넣는 클레임). iat 는 jwtService 가 서명 시 자동으로 채운다.
export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
}

// 가드 통과 후 컨트롤러/서비스에서 사용할 인증 사용자.
export interface AuthenticatedUser {
  id: number;
  email: string;
}

// req.user 를 붙인 요청 타입.
export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

// 비밀번호 재설정 이후에 발급된 토큰인지 확인한다.
// 사용자가 삭제됐거나, 재설정 이전에 발급된 토큰이면 false.
// JwtAuthGuard 와 선택적 Bearer 경로(optional-bearer)가 공유한다.
//
// iat 는 초 단위로 내림된 값이라 passwordChangedAt(밀리초 정밀도)과 그대로
// 비교하면 같은 초 안에서 발급된 최신 토큰이 잘못 거부될 수 있다.
// passwordChangedAt 도 초 단위로 내림해, 최대 1초의 구 토큰 유효기간을
// 감수하고 같은 초 오탈락을 없앤다.
export async function isTokenIssuedAfterPasswordChange(
  prisma: PrismaService,
  payload: JwtPayload,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { passwordChangedAt: true },
  });
  if (!user) {
    return false;
  }
  return !(
    user.passwordChangedAt &&
    payload.iat !== undefined &&
    payload.iat * 1000 <
      Math.floor(user.passwordChangedAt.getTime() / 1000) * 1000
  );
}

// Authorization: Bearer <JWT> 헤더를 검증하고 req.user = { id, email } 를 채운다.
// 토큰이 없거나 무효면 UNAUTHENTICATED(401). 재사용 가능하도록 export.
//
// JWT는 원래 무상태(서명 검증만, DB 조회 없음)이지만, 비밀번호 재설정 이후
// 예전 토큰을 계속 쓸 수 있으면 안 되므로 User.passwordChangedAt 과 토큰
// 발급 시각(iat)을 비교하는 최소한의 DB 조회를 추가한다.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw this.unauthenticated();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    if (!(await isTokenIssuedAfterPasswordChange(this.prisma, payload))) {
      throw this.unauthenticated();
    }

    request.user = { id: payload.sub, email: payload.email };
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    if (scheme !== 'Bearer' || !value) {
      return null;
    }
    return value;
  }

  private unauthenticated(): DomainException {
    return new DomainException(
      ErrorCode.UNAUTHENTICATED,
      HttpStatus.UNAUTHORIZED,
      '인증이 필요합니다.',
    );
  }
}
