import { hash } from 'bcryptjs';
import type { RegisterParticipantRequest } from '@whenwe/types';
import { InvitesService } from './invites.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JwtService } from '@nestjs/jwt';

// registerParticipant/participantSession 이 실제로 건드리는 최소 모델만 흉내낸다.
interface FakeMeetingRow {
  id: number;
  inviteToken: string;
  inviteTokenExpiresAt: Date | null;
  status: string;
}
interface FakeParticipantRow {
  id: number;
  meetingId: number;
  userId: number | null;
  guestName: string;
  normalizedGuestName: string | null;
  participantType: 'GUEST' | 'MEMBER';
  editToken: string | null;
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: Date | null;
}

function makeInvitesFakePrisma(
  meeting: FakeMeetingRow | null,
  participantRows: FakeParticipantRow[],
): PrismaService {
  let nextId = 1000;
  const prisma = {
    meeting: { findUnique: () => Promise.resolve(meeting) },
    participant: {
      findUnique: ({
        where,
      }: {
        where: { userId_meetingId?: { userId: number; meetingId: number } };
      }) => {
        if (!where.userId_meetingId) return Promise.resolve(null);
        const { userId, meetingId } = where.userId_meetingId;
        const found = participantRows.find(
          (p) => p.userId === userId && p.meetingId === meetingId,
        );
        return Promise.resolve(found ?? null);
      },
      findFirst: ({
        where,
      }: {
        where: { meetingId: number; normalizedGuestName: string };
      }) => {
        const found = participantRows.find(
          (p) =>
            p.meetingId === where.meetingId &&
            p.normalizedGuestName === where.normalizedGuestName,
        );
        return Promise.resolve(found ?? null);
      },
      create: ({ data }: { data: Partial<FakeParticipantRow> }) => {
        // 실제 Prisma 처럼 (meetingId, normalizedGuestName) 유니크를 검사(null 은 예외).
        if (
          data.normalizedGuestName != null &&
          participantRows.some(
            (p) =>
              p.meetingId === data.meetingId &&
              p.normalizedGuestName === data.normalizedGuestName,
          )
        ) {
          const err = Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002',
          });
          return Promise.reject(err);
        }
        const row: FakeParticipantRow = {
          id: nextId++,
          meetingId: data.meetingId!,
          userId: data.userId ?? null,
          guestName: data.guestName!,
          normalizedGuestName: data.normalizedGuestName ?? null,
          participantType:
            (data.participantType as 'GUEST' | 'MEMBER') ?? 'GUEST',
          editToken: data.editToken ?? null,
          pinHash: data.pinHash ?? null,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        };
        participantRows.push(row);
        return Promise.resolve(row);
      },
      update: ({
        where,
        data,
      }: {
        where: { id: number };
        data: Partial<FakeParticipantRow> & {
          pinFailedAttempts?: number | { increment: number };
        };
      }) => {
        const row = participantRows.find((p) => p.id === where.id)!;
        if (typeof data.pinFailedAttempts === 'object') {
          row.pinFailedAttempts += data.pinFailedAttempts.increment;
        } else if (typeof data.pinFailedAttempts === 'number') {
          row.pinFailedAttempts = data.pinFailedAttempts;
        }
        if ('pinLockedUntil' in data) {
          row.pinLockedUntil = data.pinLockedUntil as Date | null;
        }
        return Promise.resolve(row);
      },
    },
  };
  return prisma as unknown as PrismaService;
}

const fakeJwtService = {} as unknown as JwtService; // authHeader 없는 테스트만 다루므로 호출되지 않음

describe('InvitesService.registerParticipant — 비회원 PIN', () => {
  const meeting: FakeMeetingRow = {
    id: 1,
    inviteToken: 'invite-1',
    inviteTokenExpiresAt: null,
    status: 'COLLECTING',
  };

  function makeBody(
    overrides: Partial<RegisterParticipantRequest> = {},
  ): RegisterParticipantRequest {
    return { guestName: '민수', pin: '1234', ...overrides };
  }

  it('PIN 형식이 숫자 4자리가 아니면 400을 던진다', async () => {
    const prisma = makeInvitesFakePrisma(meeting, []);
    const service = new InvitesService(prisma, fakeJwtService);

    await expect(
      service.registerParticipant(
        'invite-1',
        makeBody({ pin: '12a4' }),
        undefined,
      ),
    ).rejects.toThrow('참여 PIN은 숫자 4자리여야 합니다.');
    await expect(
      service.registerParticipant(
        'invite-1',
        makeBody({ pin: '123' }),
        undefined,
      ),
    ).rejects.toThrow('참여 PIN은 숫자 4자리여야 합니다.');
    await expect(
      service.registerParticipant(
        'invite-1',
        makeBody({ pin: undefined }),
        undefined,
      ),
    ).rejects.toThrow('참여 PIN은 숫자 4자리여야 합니다.');
  });

  it('같은 모임에 정규화 닉네임이 중복되면 409(PARTICIPANT_NICKNAME_TAKEN)를 던진다', async () => {
    const existingPinHash = await hash('9999', 10);
    const prisma = makeInvitesFakePrisma(meeting, [
      {
        id: 1,
        meetingId: 1,
        userId: null,
        guestName: '민수',
        normalizedGuestName: '민수', // 이미 정규화된 형태로 저장돼 있음
        participantType: 'GUEST',
        editToken: 'existing-token',
        pinHash: existingPinHash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    ]);
    const service = new InvitesService(prisma, fakeJwtService);

    // 공백만 다른 "  민수  "(정규화하면 기존 "민수"와 동일)로 재등록 시도 — 정규화
    // 자체가 중복을 잡아내는지 검증(단순 문자열 완전일치가 아니라).
    await expect(
      service.registerParticipant(
        'invite-1',
        makeBody({ guestName: '  민수  ' }),
        undefined,
      ),
    ).rejects.toMatchObject({ code: 'PARTICIPANT_NICKNAME_TAKEN' });
  });

  it('정상 등록 시 PIN을 해시로 저장하고 평문을 응답에 노출하지 않는다', async () => {
    const participantRows: FakeParticipantRow[] = [];
    const prisma = makeInvitesFakePrisma(meeting, participantRows);
    const service = new InvitesService(prisma, fakeJwtService);

    const result = await service.registerParticipant(
      'invite-1',
      makeBody(),
      undefined,
    );

    expect(result.guestName).toBe('민수');
    expect(typeof result.participantEditToken).toBe('string');
    expect(JSON.stringify(result)).not.toContain('1234'); // 평문 PIN 미노출

    expect(participantRows).toHaveLength(1);
    expect(participantRows[0].normalizedGuestName).toBe('민수');
    expect(participantRows[0].pinHash).not.toBe('1234');
    expect(participantRows[0].pinHash).not.toBeNull();
  });

  it('다른 모임에는 같은 닉네임으로 등록할 수 있다', async () => {
    const otherMeetingParticipant: FakeParticipantRow = {
      id: 1,
      meetingId: 999, // 다른 모임
      userId: null,
      guestName: '민수',
      normalizedGuestName: '민수',
      participantType: 'GUEST',
      editToken: 'other-token',
      pinHash: 'x',
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    };
    const prisma = makeInvitesFakePrisma(meeting, [otherMeetingParticipant]);
    const service = new InvitesService(prisma, fakeJwtService);

    await expect(
      service.registerParticipant('invite-1', makeBody(), undefined),
    ).resolves.toMatchObject({ guestName: '민수' });
  });
});
