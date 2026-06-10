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

// JWT payload 의 형태(서명 시 넣는 클레임).
export interface JwtPayload {
  sub: number;
  email: string;
}

// 가드 통과 후 컨트롤러/서비스에서 사용할 인증 사용자.
export interface AuthenticatedUser {
  id: number;
  email: string;
}

// req.user 를 붙인 요청 타입.
export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

// Authorization: Bearer <JWT> 헤더를 검증하고 req.user = { id, email } 를 채운다.
// 토큰이 없거나 무효면 UNAUTHENTICATED(401). 재사용 가능하도록 export.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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
