import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import {
  ErrorCode,
  type AuthUser,
  type LoginRequest,
  type LoginResult,
  type SignupRequest,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';
import type { JwtPayload } from './jwt-auth.guard';

// bcrypt cost. 평문 비밀번호는 해시 저장만 하고 어떤 응답/로그에도 노출하지 않는다.
const BCRYPT_ROUNDS = 10;
// 간단한 이메일 형식 검증(전역 ValidationPipe 도입 대신 invites 선례처럼 수동 검증).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 로그인 시 사용자가 없어도 더미 해시로 compare 를 1회 수행해 응답 시간을 평탄화한다
// (존재 이메일은 bcrypt 비교 비용, 없는 이메일은 즉시 반환되는 타이밍 차로 계정을 열거하는 것 방지).
const DUMMY_PASSWORD_HASH = hashSync('whenwe-timing-equalizer', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(body: SignupRequest): Promise<AuthUser> {
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;
    const nickname = body?.nickname?.trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new BadRequestException('이메일 형식이 올바르지 않습니다.');
    }
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 72
    ) {
      throw new BadRequestException('비밀번호는 8~72자여야 합니다.');
    }
    if (!nickname || nickname.length < 1 || nickname.length > 30) {
      throw new BadRequestException('닉네임은 1~30자여야 합니다.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw this.emailAlreadyExists();
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    try {
      return await this.prisma.user.create({
        data: { email, nickname, password: passwordHash },
        select: { id: true, email: true, nickname: true },
      });
    } catch (e) {
      // 동시 가입 경합: 선검사 통과 후 unique(email) 위반 → 409 로 변환(500 누출 방지).
      if (this.isUniqueViolation(e)) {
        throw this.emailAlreadyExists();
      }
      throw e;
    }
  }

  async login(body: LoginRequest): Promise<LoginResult> {
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || typeof password !== 'string') {
      throw this.invalidCredentials();
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    // 사용자 없음/비밀번호 불일치는 동일 에러 + 동일 시간으로 응답(계정 존재·타이밍 노출 방지).
    const passwordOk = await compare(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordOk) {
      throw this.invalidCredentials();
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    };
  }

  async getMe(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true },
    });
    // 가드를 통과한 토큰의 사용자가 삭제된 경우.
    if (!user) {
      throw new DomainException(
        ErrorCode.UNAUTHENTICATED,
        HttpStatus.UNAUTHORIZED,
        '인증이 필요합니다.',
      );
    }
    return user;
  }

  private invalidCredentials(): DomainException {
    return new DomainException(
      ErrorCode.INVALID_CREDENTIALS,
      HttpStatus.UNAUTHORIZED,
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    );
  }

  private emailAlreadyExists(): DomainException {
    return new DomainException(
      ErrorCode.EMAIL_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
      '이미 사용 중인 이메일입니다.',
    );
  }

  // Prisma unique 제약 위반(P2002) 판별.
  private isUniqueViolation(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: unknown }).code === 'P2002'
    );
  }
}
