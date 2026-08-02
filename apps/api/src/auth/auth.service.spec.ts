import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';

interface FakeUser {
  id: number;
  email: string;
  password: string;
  nickname: string;
  passwordChangedAt: Date | null;
}

interface FakeResetToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

function makeFakePrisma(users: FakeUser[], tokens: FakeResetToken[] = []) {
  let nextTokenId = tokens.length + 1;

  const tx = {
    passwordResetToken: {
      updateMany: ({
        where,
        data,
      }: {
        where: { id?: number; userId?: number; usedAt: null };
        data: { usedAt: Date };
      }) => {
        let count = 0;
        for (const t of tokens) {
          if (where.id !== undefined && t.id !== where.id) continue;
          if (where.userId !== undefined && t.userId !== where.userId) continue;
          if (t.usedAt !== where.usedAt) continue;
          t.usedAt = data.usedAt;
          count += 1;
        }
        return Promise.resolve({ count });
      },
      create: ({
        data,
      }: {
        data: { userId: number; tokenHash: string; expiresAt: Date };
      }) => {
        const created: FakeResetToken = {
          id: nextTokenId++,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
          createdAt: new Date(),
        };
        tokens.push(created);
        return Promise.resolve(created);
      },
    },
    user: {
      update: ({
        where,
        data,
      }: {
        where: { id: number };
        data: { password: string; passwordChangedAt: Date };
      }) => {
        const u = users.find((x) => x.id === where.id)!;
        u.password = data.password;
        u.passwordChangedAt = data.passwordChangedAt;
        return Promise.resolve(u);
      },
    },
  };

  const prisma = {
    user: {
      findUnique: ({ where }: { where: { email: string } }) =>
        Promise.resolve(users.find((u) => u.email === where.email) ?? null),
    },
    passwordResetToken: {
      findFirst: ({ where }: { where: { userId: number } }) => {
        const matches = tokens
          .filter((t) => t.userId === where.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return Promise.resolve(matches[0] ?? null);
      },
      findUnique: ({ where }: { where: { tokenHash: string } }) =>
        Promise.resolve(
          tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
        ),
    },
    $transaction: (fn: (t: typeof tx) => unknown) => Promise.resolve(fn(tx)),
  };

  return { prisma: prisma as unknown as PrismaService, users, tokens };
}

function makeFakeMail() {
  const sent: Array<{ to: string; resetUrl: string }> = [];
  const mailService = {
    sendPasswordResetEmail: (to: string, resetUrl: string) => {
      sent.push({ to, resetUrl });
      return Promise.resolve();
    },
  };
  return { mailService: mailService as unknown as MailService, sent };
}

describe('AuthService.forgotPassword', () => {
  it('존재하는 이메일이면 토큰을 만들고 메일을 보낸다', async () => {
    const { prisma, tokens } = makeFakePrisma([
      {
        id: 1,
        email: 'a@test.com',
        password: 'hash',
        nickname: '민수',
        passwordChangedAt: null,
      },
    ]);
    const { mailService, sent } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    const result = await service.forgotPassword('a@test.com');

    expect(result).toEqual({});
    expect(tokens).toHaveLength(1);
    expect(tokens[0].usedAt).toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('a@test.com');
    expect(sent[0].resetUrl).toContain('/reset-password?token=');
  });

  it('존재하지 않는 이메일이어도 동일한 성공 응답을 반환하고 메일을 보내지 않는다', async () => {
    const { prisma, tokens } = makeFakePrisma([]);
    const { mailService, sent } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    const result = await service.forgotPassword('nobody@test.com');

    expect(result).toEqual({});
    expect(tokens).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('쿨다운 이내 재요청은 새 토큰을 만들지 않고 메일도 보내지 않는다', async () => {
    const { prisma, tokens } = makeFakePrisma([
      {
        id: 1,
        email: 'a@test.com',
        password: 'hash',
        nickname: '민수',
        passwordChangedAt: null,
      },
    ]);
    const { mailService, sent } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await service.forgotPassword('a@test.com');
    const result = await service.forgotPassword('a@test.com');

    expect(result).toEqual({});
    expect(tokens).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it('메일 발송이 실패해도 예외를 던지지 않고 동일한 성공 응답을 반환한다', async () => {
    const { prisma, tokens } = makeFakePrisma([
      {
        id: 1,
        email: 'a@test.com',
        password: 'hash',
        nickname: '민수',
        passwordChangedAt: null,
      },
    ]);
    const mailService = {
      sendPasswordResetEmail: () =>
        Promise.reject(new Error('Resend API 오류')),
    };
    const service = new AuthService(
      prisma,
      {} as never,
      mailService as unknown as MailService,
    );

    const result = await service.forgotPassword('a@test.com');

    expect(result).toEqual({});
    expect(tokens).toHaveLength(1);
  });

  it('새 토큰 발급 시 기존 미사용 토큰을 무효화한다', async () => {
    const { prisma, tokens } = makeFakePrisma(
      [
        {
          id: 1,
          email: 'a@test.com',
          password: 'hash',
          nickname: '민수',
          passwordChangedAt: null,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tokenHash: 'old-hash',
          expiresAt: new Date(Date.now() + 60000),
          usedAt: null,
          createdAt: new Date(Date.now() - 120000), // 쿨다운(60초) 밖
        },
      ],
    );
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await service.forgotPassword('a@test.com');

    expect(tokens.find((t) => t.id === 1)!.usedAt).not.toBeNull();
    expect(tokens).toHaveLength(2);
  });
});

describe('AuthService.resetPassword', () => {
  it('유효한 토큰이면 비밀번호를 변경하고 토큰을 사용 처리한다', async () => {
    const rawToken = 'valid-raw-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const { prisma, users, tokens } = makeFakePrisma(
      [
        {
          id: 1,
          email: 'a@test.com',
          password: 'old-hash',
          nickname: '민수',
          passwordChangedAt: null,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tokenHash,
          expiresAt: new Date(Date.now() + 60000),
          usedAt: null,
          createdAt: new Date(),
        },
      ],
    );
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    const result = await service.resetPassword(rawToken, 'newPassword123');

    expect(result).toEqual({});
    expect(users[0].password).not.toBe('old-hash');
    expect(users[0].passwordChangedAt).not.toBeNull();
    expect(tokens[0].usedAt).not.toBeNull();
  });

  it('존재하지 않는 토큰이면 PASSWORD_RESET_TOKEN_INVALID 를 던진다', async () => {
    const { prisma } = makeFakePrisma([]);
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await expect(
      service.resetPassword('nope', 'newPassword123'),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_TOKEN_INVALID' });
  });

  it('만료된 토큰이면 거부한다', async () => {
    const rawToken = 'expired-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const { prisma } = makeFakePrisma(
      [
        {
          id: 1,
          email: 'a@test.com',
          password: 'old-hash',
          nickname: '민수',
          passwordChangedAt: null,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
          createdAt: new Date(Date.now() - 60000),
        },
      ],
    );
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await expect(
      service.resetPassword(rawToken, 'newPassword123'),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_TOKEN_INVALID' });
  });

  it('이미 사용된 토큰이면 거부한다', async () => {
    const rawToken = 'used-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const { prisma } = makeFakePrisma(
      [
        {
          id: 1,
          email: 'a@test.com',
          password: 'old-hash',
          nickname: '민수',
          passwordChangedAt: null,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tokenHash,
          expiresAt: new Date(Date.now() + 60000),
          usedAt: new Date(),
          createdAt: new Date(),
        },
      ],
    );
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await expect(
      service.resetPassword(rawToken, 'newPassword123'),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_TOKEN_INVALID' });
  });

  it('8자 미만 비밀번호는 거부한다', async () => {
    const { prisma } = makeFakePrisma([]);
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await expect(service.resetPassword('any-token', 'short')).rejects.toThrow(
      '비밀번호는 8~72자여야 합니다.',
    );
  });

  it('사전 조회 이후 트랜잭션 전에 다른 요청이 먼저 토큰을 사용 처리하면(경합) 거부한다', async () => {
    // 사전 조회(findUnique) 직후 스냅샷은 usedAt: null 이라 최초 가드는 통과하지만,
    // 트랜잭션의 조건부 updateMany 시점에는 실제 토큰이 이미 사용 처리되어 있어
    // count: 0 으로 거부되어야 한다(TOCTOU 경합 방지 검증).
    const rawToken = 'race-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const token: FakeResetToken = {
      id: 1,
      userId: 1,
      tokenHash,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
      createdAt: new Date(),
    };

    const prisma = {
      passwordResetToken: {
        findUnique: () => {
          const snapshot = { ...token };
          // 조회 직후, 다른 요청이 먼저 이 토큰을 사용 처리했다고 가정.
          token.usedAt = new Date();
          return Promise.resolve(snapshot);
        },
      },
      $transaction: (
        fn: (tx: {
          passwordResetToken: {
            updateMany: (args: {
              where: { id?: number; userId?: number; usedAt: null };
              data: { usedAt: Date };
            }) => Promise<{ count: number }>;
          };
          user: { update: (args: unknown) => Promise<unknown> };
        }) => unknown,
      ) =>
        Promise.resolve(
          fn({
            passwordResetToken: {
              updateMany: ({ where, data }) => {
                if (
                  (where.id === undefined || where.id === token.id) &&
                  (where.userId === undefined ||
                    where.userId === token.userId) &&
                  token.usedAt === where.usedAt
                ) {
                  token.usedAt = data.usedAt;
                  return Promise.resolve({ count: 1 });
                }
                return Promise.resolve({ count: 0 });
              },
            },
            user: { update: () => Promise.resolve(undefined) },
          }),
        ),
    };
    const { mailService } = makeFakeMail();
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as never,
      mailService,
    );

    await expect(
      service.resetPassword(rawToken, 'newPassword123'),
    ).rejects.toMatchObject({ code: 'PASSWORD_RESET_TOKEN_INVALID' });
  });

  it('재설정 성공 시 같은 사용자의 다른 미사용 토큰도 모두 무효화한다', async () => {
    const rawToken = 'primary-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const otherTokenHash = createHash('sha256')
      .update('other-token')
      .digest('hex');
    const { prisma, tokens } = makeFakePrisma(
      [
        {
          id: 1,
          email: 'a@test.com',
          password: 'old-hash',
          nickname: '민수',
          passwordChangedAt: null,
        },
      ],
      [
        {
          id: 1,
          userId: 1,
          tokenHash,
          expiresAt: new Date(Date.now() + 60000),
          usedAt: null,
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          tokenHash: otherTokenHash,
          expiresAt: new Date(Date.now() + 60000),
          usedAt: null,
          createdAt: new Date(),
        },
      ],
    );
    const { mailService } = makeFakeMail();
    const service = new AuthService(prisma, {} as never, mailService);

    await service.resetPassword(rawToken, 'newPassword123');

    expect(tokens[0].usedAt).not.toBeNull();
    expect(tokens[1].usedAt).not.toBeNull();
  });
});
