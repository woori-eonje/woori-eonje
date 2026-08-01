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
        where: { userId: number; usedAt: null };
        data: { usedAt: Date };
      }) => {
        let count = 0;
        for (const t of tokens) {
          if (t.userId === where.userId && t.usedAt === null) {
            t.usedAt = data.usedAt;
            count += 1;
          }
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
      update: ({
        where,
        data,
      }: {
        where: { id: number };
        data: { usedAt: Date };
      }) => {
        const t = tokens.find((x) => x.id === where.id)!;
        t.usedAt = data.usedAt;
        return Promise.resolve(t);
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
