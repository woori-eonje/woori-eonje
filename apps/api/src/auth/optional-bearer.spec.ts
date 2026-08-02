import { JwtService } from '@nestjs/jwt';
import { resolveOptionalUserId } from './optional-bearer';
import type { PrismaService } from '../prisma/prisma.service';

function makeFakePrisma(passwordChangedAt: Date | null) {
  return {
    user: {
      findUnique: () => Promise.resolve({ passwordChangedAt }),
    },
  } as unknown as PrismaService;
}

describe('resolveOptionalUserId', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });

  it('Authorization 헤더가 없으면 null(비회원 경로)을 반환한다', async () => {
    await expect(
      resolveOptionalUserId(jwtService, makeFakePrisma(null), undefined),
    ).resolves.toBeNull();
  });

  it('Bearer 형식이 아니면 null(비회원 경로)을 반환한다', async () => {
    await expect(
      resolveOptionalUserId(jwtService, makeFakePrisma(null), 'Basic xyz'),
    ).resolves.toBeNull();
  });

  it('비밀번호를 변경한 적 없는 사용자의 토큰은 userId 를 반환한다', async () => {
    const token = jwtService.sign({ sub: 7, email: 'a@test.com' });

    await expect(
      resolveOptionalUserId(
        jwtService,
        makeFakePrisma(null),
        `Bearer ${token}`,
      ),
    ).resolves.toBe(7);
  });

  it('토큰 발급 이후 비밀번호가 바뀌었으면 거부한다(비회원 강등 아님)', async () => {
    const token = jwtService.sign({ sub: 7, email: 'a@test.com' });
    const changedAfterToken = new Date(Date.now() + 2000);

    await expect(
      resolveOptionalUserId(
        jwtService,
        makeFakePrisma(changedAfterToken),
        `Bearer ${token}`,
      ),
    ).rejects.toThrow('인증이 필요합니다.');
  });

  it('토큰 발급 이전에 비밀번호가 바뀌었으면(최신 토큰) userId 를 반환한다', async () => {
    const changedBeforeToken = new Date(Date.now() - 2000);
    const token = jwtService.sign({ sub: 7, email: 'a@test.com' });

    await expect(
      resolveOptionalUserId(
        jwtService,
        makeFakePrisma(changedBeforeToken),
        `Bearer ${token}`,
      ),
    ).resolves.toBe(7);
  });

  it('서명이 깨진 토큰은 거부한다', async () => {
    await expect(
      resolveOptionalUserId(
        jwtService,
        makeFakePrisma(null),
        'Bearer not-a-real-token',
      ),
    ).rejects.toThrow('인증이 필요합니다.');
  });

  it('사용자를 찾을 수 없으면(탈퇴 등) 거부한다', async () => {
    const token = jwtService.sign({ sub: 7, email: 'a@test.com' });
    const prisma = {
      user: {
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaService;

    await expect(
      resolveOptionalUserId(jwtService, prisma, `Bearer ${token}`),
    ).rejects.toThrow('인증이 필요합니다.');
  });
});
