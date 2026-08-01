import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { PrismaService } from '../prisma/prisma.service';

function makeFakePrisma(passwordChangedAt: Date | null) {
  return {
    user: {
      findUnique: () => Promise.resolve({ passwordChangedAt }),
    },
  } as unknown as PrismaService;
}

function makeContext(authHeader?: string): ExecutionContext {
  const request = { headers: { authorization: authHeader } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });

  it('Authorization 헤더가 없으면 거부한다', async () => {
    const guard = new JwtAuthGuard(jwtService, makeFakePrisma(null));
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      '인증이 필요합니다.',
    );
  });

  it('비밀번호를 변경한 적 없는 사용자의 토큰은 통과한다', async () => {
    const token = jwtService.sign({ sub: 1, email: 'a@test.com' });
    const guard = new JwtAuthGuard(jwtService, makeFakePrisma(null));

    await expect(
      guard.canActivate(makeContext(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });

  it('토큰 발급 이후 비밀번호가 바뀌었으면 거부한다', async () => {
    const token = jwtService.sign({ sub: 1, email: 'a@test.com' });
    const changedAfterToken = new Date(Date.now() + 2000);
    const guard = new JwtAuthGuard(
      jwtService,
      makeFakePrisma(changedAfterToken),
    );

    await expect(
      guard.canActivate(makeContext(`Bearer ${token}`)),
    ).rejects.toThrow('인증이 필요합니다.');
  });

  it('토큰 발급 이전에 비밀번호가 바뀌었으면(최신 토큰) 통과한다', async () => {
    const changedBeforeToken = new Date(Date.now() - 2000);
    const token = jwtService.sign({ sub: 1, email: 'a@test.com' });
    const guard = new JwtAuthGuard(
      jwtService,
      makeFakePrisma(changedBeforeToken),
    );

    await expect(
      guard.canActivate(makeContext(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });
});
