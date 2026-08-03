import { AvailabilityService } from './availability.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RecommendationsService } from '../recommendations/recommendations.service';
import type { JwtService } from '@nestjs/jwt';

// submitAvailability 의 빈 배열 차단만 검증하는 최소 가짜 Prisma.
// authenticateParticipant(비회원 edit-token 경로) + meeting 조회만 필요하다.
interface FakeParticipantRow {
  id: number;
  meetingId: number;
  guestName: string;
  editToken: string;
}
interface FakeMeetingRow {
  id: number;
  status: string;
}

function makeAvailabilityFakePrisma(
  meeting: FakeMeetingRow | null,
  participant: FakeParticipantRow | null,
  spies: {
    transaction: jest.Mock;
    deleteMany: jest.Mock;
    upsert: jest.Mock;
  },
): PrismaService {
  const prisma = {
    meeting: { findUnique: () => Promise.resolve(meeting) },
    participant: {
      findUnique: () => Promise.resolve(participant),
    },
    participantAvailability: {
      deleteMany: spies.deleteMany,
      upsert: spies.upsert,
    },
    $transaction: spies.transaction,
  };
  return prisma as unknown as PrismaService;
}

const fakeJwtService = {} as unknown as JwtService; // Authorization 헤더 없는 테스트만 다루므로 호출되지 않음

describe('AvailabilityService.submitAvailability — 빈 응답 제출 차단', () => {
  const meeting: FakeMeetingRow = { id: 1, status: 'COLLECTING' };
  const participant: FakeParticipantRow = {
    id: 10,
    meetingId: 1,
    guestName: '민수',
    editToken: 'edit-token-abc',
  };

  it('items 가 빈 배열이면 400(AVAILABILITY_REQUIRED)을 던지고 아무것도 쓰지 않는다', async () => {
    const spies = {
      transaction: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    };
    const prisma = makeAvailabilityFakePrisma(meeting, participant, spies);
    const recompute = jest.fn().mockResolvedValue(undefined);
    const service = new AvailabilityService(
      prisma,
      { recompute } as unknown as RecommendationsService,
      fakeJwtService,
    );

    await expect(
      service.submitAvailability(1, 'edit-token-abc', undefined, {
        participantId: 10,
        items: [],
      }),
    ).rejects.toMatchObject({ code: 'AVAILABILITY_REQUIRED' });

    expect(spies.transaction).not.toHaveBeenCalled();
    expect(recompute).not.toHaveBeenCalled();
  });

  it('기존 응답자가 items:[] 를 보내도 저장된 응답이 삭제되지 않는다', async () => {
    // "기존 응답자"라는 조건은 authenticateParticipant/meeting 조회 결과에 드러나지 않으므로
    // (참여자 존재 여부만 확인) 신규/기존 참여자 모두 동일한 참여자 레코드로 재현 가능하다 —
    // 핵심은 빈 배열이면 deleteMany(기존 응답 삭제)가 절대 호출되지 않는다는 것.
    const spies = {
      transaction: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    };
    const prisma = makeAvailabilityFakePrisma(meeting, participant, spies);
    const recompute = jest.fn().mockResolvedValue(undefined);
    const service = new AvailabilityService(
      prisma,
      { recompute } as unknown as RecommendationsService,
      fakeJwtService,
    );

    await expect(
      service.submitAvailability(1, 'edit-token-abc', undefined, {
        participantId: 10,
        items: [],
      }),
    ).rejects.toMatchObject({ code: 'AVAILABILITY_REQUIRED' });

    expect(spies.deleteMany).not.toHaveBeenCalled();
    expect(spies.upsert).not.toHaveBeenCalled();
  });
});
