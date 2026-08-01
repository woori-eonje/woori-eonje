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

  it('토큰 발급과 같은 초에 비밀번호가 바뀌었으면 통과한다(초 단위 경계)', async () => {
    const token = jwtService.sign({ sub: 1, email: 'a@test.com' });
    const { iat } = jwtService.decode<{ iat: number }>(token);
    // passwordChangedAt 을 토큰의 iat 와 같은 초 안에서, 하지만 더 나중(밀리초 단위)으로 설정.
    const changedSameSecond = new Date(iat * 1000 + 500);
    const guard = new JwtAuthGuard(
      jwtService,
      makeFakePrisma(changedSameSecond),
    );

    await expect(
      guard.canActivate(makeContext(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });

  it('사용자를 찾을 수 없으면(탈퇴 등) 거부한다', async () => {
    const token = jwtService.sign({ sub: 1, email: 'a@test.com' });
    const prisma = {
      user: {
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(jwtService, prisma);

    await expect(
      guard.canActivate(makeContext(`Bearer ${token}`)),
    ).rejects.toThrow('인증이 필요합니다.');
  });
});
