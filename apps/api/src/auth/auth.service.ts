import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import {
  ErrorCode,
  type AuthUser,
  type LoginRequest,
  type LoginResult,
  type SignupRequest,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';
import { MailService } from '../mail/mail.service';
import type { JwtPayload } from './jwt-auth.guard';

// bcrypt cost. 평문 비밀번호는 해시 저장만 하고 어떤 응답/로그에도 노출하지 않는다.
const BCRYPT_ROUNDS = 10;
// 간단한 이메일 형식 검증(전역 ValidationPipe 도입 대신 invites 선례처럼 수동 검증).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 로그인 시 사용자가 없어도 더미 해시로 compare 를 1회 수행해 응답 시간을 평탄화한다
// (존재 이메일은 bcrypt 비교 비용, 없는 이메일은 즉시 반환되는 타이밍 차로 계정을 열거하는 것 방지).
const DUMMY_PASSWORD_HASH = hashSync('whenwe-timing-equalizer', BCRYPT_ROUNDS);
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30분
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000; // 60초
// 존재하지 않는 이메일 처리 시간을 실제 발송(네트워크 호출 포함)과 비슷하게
// 맞춰, 응답 시간 차이로 계정 존재 여부가 드러나지 않게 한다.
const NONEXISTENT_EMAIL_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

  async forgotPassword(
    email: string | undefined,
  ): Promise<Record<string, never>> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      throw new BadRequestException('이메일 형식이 올바르지 않습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await sleep(NONEXISTENT_EMAIL_DELAY_MS);
      return {};
    }

    const latestToken = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (
      latestToken &&
      Date.now() - latestToken.createdAt.getTime() < PASSWORD_RESET_COOLDOWN_MS
    ) {
      // 쿨다운 이내 반복 요청 — 조용히 무시. 존재하지 않는 이메일 경로와 응답 시간을
      // 맞춰(둘 다 sleep), 캐시/쿨다운 여부로 계정 존재가 타이밍으로 드러나지 않게 한다.
      await sleep(NONEXISTENT_EMAIL_DELAY_MS);
      return {};
    }

    const { rawToken, tokenHash } = generateResetToken();
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        },
      });
    });

    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const resetUrl = `${webBaseUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(normalizedEmail, resetUrl);

    return {};
  }

  async resetPassword(
    token: string | undefined,
    newPassword: string | undefined,
  ): Promise<Record<string, never>> {
    if (!token || typeof newPassword !== 'string') {
      throw this.passwordResetTokenInvalid();
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      throw new BadRequestException('비밀번호는 8~72자여야 합니다.');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      throw this.passwordResetTokenInvalid();
    }

    const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: passwordHash, passwordChangedAt: now },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });
    });

    return {};
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

  private passwordResetTokenInvalid(): DomainException {
    return new DomainException(
      ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      HttpStatus.BAD_REQUEST,
      '유효하지 않거나 만료된 링크입니다.',
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
