import {
  AvailabilityStatus,
  MeetingCategory,
  ParticipantType,
} from '@whenwe/types';
import type { CreateMeetingRequest } from '@whenwe/types';
import { MeetingsService } from './meetings.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RecommendationsService } from '../recommendations/recommendations.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// createMeeting 이 쓰는 최소한의 가짜 Prisma — $transaction 콜백 안에서
// meeting.create / availabilitySlot.createMany / meetingStateLog.create 만 필요.
function makeFakePrisma(): PrismaService {
  const tx = {
    meeting: {
      create: ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 1, inviteToken: 'test-invite-token', ...data }),
    },
    availabilitySlot: {
      createMany: () => Promise.resolve({ count: 0 }),
    },
    meetingStateLog: {
      create: () => Promise.resolve({}),
    },
  };

  const prisma = {
    $transaction: (fn: (t: typeof tx) => unknown) => Promise.resolve(fn(tx)),
  };

  return prisma as unknown as PrismaService;
}

// UTC 시각을 KST 달력 기준 YYYY-MM-DD 문자열로 변환.
function kstDateString(utcMs: number): string {
  return new Date(utcMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// periodDays 일짜리(양끝 포함) 유효한 CreateMeetingRequest를 현재 시각 기준
// 상대 날짜로 만든다. 절대 날짜를 박아두면 시간이 지나 "마감은 미래여야 한다"
// 검증에 걸려, 기간 로직과 무관한 이유로 테스트가 깨진다.
function makeBody(
  periodDays: number,
  overrides: Partial<CreateMeetingRequest> = {},
): CreateMeetingRequest {
  const startMs = Date.now() + MS_PER_DAY;
  const endMs = startMs + (periodDays - 1) * MS_PER_DAY;
  const startDate = kstDateString(startMs);
  const endDate = kstDateString(endMs);
  // 종료일 20:00(KST) — 상한(종료일 다음날 00:00 KST)보다 여유 있게 이르다.
  const deadlineMs =
    Date.parse(`${endDate}T00:00:00+09:00`) + 20 * 60 * 60 * 1000;

  return {
    title: '조율 기간 테스트',
    category: MeetingCategory.FRIEND,
    startDate,
    endDate,
    availableStartTime: '09:00',
    availableEndTime: '10:00',
    durationHours: 1,
    responseDeadline: new Date(deadlineMs).toISOString(),
    ...overrides,
  };
}

describe('MeetingsService.createMeeting — 조율 기간 최대 30일', () => {
  it('30일짜리 기간(경계값)은 통과한다', async () => {
    const service = new MeetingsService(
      makeFakePrisma(),
      {} as unknown as RecommendationsService,
    );

    const result = await service.createMeeting(1, makeBody(30));

    expect(result.meetingId).toBe(1);
  });

  it('31일짜리 기간은 거부한다', async () => {
    const service = new MeetingsService(
      makeFakePrisma(),
      {} as unknown as RecommendationsService,
    );

    await expect(service.createMeeting(1, makeBody(31))).rejects.toThrow(
      '조율 기간은 최대 30일입니다.',
    );
  });
});

// getVoteDetails 는 createMeeting 과 전혀 다른 모델(participant/availabilitySlot/
// participantAvailability/recommendationResult 조회)을 다루므로 전용 가짜 Prisma를 둔다.
interface FakeMeetingRow {
  id: number;
  ownerId: number;
}
interface FakeParticipantRow {
  id: number;
  guestName: string;
  participantType: ParticipantType;
  isRequired: boolean;
  createdAt: Date;
}
interface FakeSlotRow {
  id: number;
  slotStartAt: Date;
  slotEndAt: Date;
}
interface FakeResponseRow {
  participantId: number;
  slotId: number;
  availabilityStatus: AvailabilityStatus;
}
interface FakeRecommendationRow {
  id: number;
  rank: number;
  startAt: Date;
  endAt: Date;
}

function makeVoteDetailsFakePrisma(
  meeting: FakeMeetingRow | null,
  participants: FakeParticipantRow[],
  slots: FakeSlotRow[],
  responses: FakeResponseRow[],
  recommendations: FakeRecommendationRow[],
): PrismaService {
  const prisma = {
    meeting: {
      findUnique: () => Promise.resolve(meeting),
    },
    participant: {
      findMany: () =>
        Promise.resolve(
          [...participants].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          ),
        ),
    },
    availabilitySlot: {
      findMany: () =>
        Promise.resolve(
          [...slots].sort(
            (a, b) => a.slotStartAt.getTime() - b.slotStartAt.getTime(),
          ),
        ),
    },
    participantAvailability: {
      findMany: () => Promise.resolve(responses),
    },
    recommendationResult: {
      findMany: () =>
        Promise.resolve([...recommendations].sort((a, b) => a.rank - b.rank)),
    },
  };

  return prisma as unknown as PrismaService;
}

describe('MeetingsService.getVoteDetails', () => {
  const OWNER_ID = 1;

  const slot101: FakeSlotRow = {
    id: 101,
    slotStartAt: new Date('2026-09-01T09:00:00Z'),
    slotEndAt: new Date('2026-09-01T10:00:00Z'),
  };
  const slot102: FakeSlotRow = {
    id: 102,
    slotStartAt: new Date('2026-09-01T10:00:00Z'),
    slotEndAt: new Date('2026-09-01T11:00:00Z'),
  };
  const slot103: FakeSlotRow = {
    id: 103,
    slotStartAt: new Date('2026-09-01T11:00:00Z'),
    slotEndAt: new Date('2026-09-01T12:00:00Z'),
  };

  const p1: FakeParticipantRow = {
    id: 10,
    guestName: '민수',
    participantType: ParticipantType.GUEST,
    isRequired: false,
    createdAt: new Date('2026-08-01T00:00:00Z'),
  };
  const p2: FakeParticipantRow = {
    id: 11,
    guestName: '지수',
    participantType: ParticipantType.GUEST,
    isRequired: true,
    createdAt: new Date('2026-08-01T00:01:00Z'),
  };
  const p3: FakeParticipantRow = {
    id: 12,
    guestName: '서연',
    participantType: ParticipantType.GUEST,
    isRequired: false,
    createdAt: new Date('2026-08-01T00:02:00Z'),
  }; // 응답 없음(no_response) 검증용

  const responses: FakeResponseRow[] = [
    {
      participantId: p1.id,
      slotId: slot101.id,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
    {
      participantId: p1.id,
      slotId: slot102.id,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
    {
      participantId: p2.id,
      slotId: slot101.id,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
    {
      participantId: p2.id,
      slotId: slot102.id,
      availabilityStatus: AvailabilityStatus.UNAVAILABLE,
    },
    // p3, slot103: 응답 없음
  ];

  // slot101+102 를 묶은 구간(추천 엔진의 durationHours=2 후보와 동일 형태) — recompute를
  // 거치지 않고 저장된 행을 직접 흉내내, getVoteDetails가 (startAt~endAt)으로 슬롯을
  // 올바르게 재구성하는지만 검증한다.
  const recommendation: FakeRecommendationRow = {
    id: 20,
    rank: 1,
    startAt: slot101.slotStartAt,
    endAt: slot102.slotEndAt,
  };

  it('슬롯별 투표·추천 구간별 참여자 상태·hasResponded 를 정확히 계산한다', async () => {
    const prisma = makeVoteDetailsFakePrisma(
      { id: 1, ownerId: OWNER_ID },
      [p1, p2, p3],
      [slot101, slot102, slot103],
      responses,
      [recommendation],
    );
    const service = new MeetingsService(
      prisma,
      {} as unknown as RecommendationsService,
    );

    const result = await service.getVoteDetails(1, OWNER_ID);

    expect(result.meetingId).toBe(1);

    // participants — hasResponded: p1·p2 는 응답 있음, p3 는 없음.
    expect(result.participants).toEqual([
      {
        participantId: 10,
        guestName: '민수',
        participantType: 'GUEST',
        isRequired: false,
        hasResponded: true,
      },
      {
        participantId: 11,
        guestName: '지수',
        participantType: 'GUEST',
        isRequired: true,
        hasResponded: true,
      },
      {
        participantId: 12,
        guestName: '서연',
        participantType: 'GUEST',
        isRequired: false,
        hasResponded: false,
      },
    ]);

    // slots — 미응답 참여자는 votes 에 없음(합이 aggregate 카운트와 일치해야 함).
    const slot101Out = result.slots.find((s) => s.slotId === 101)!;
    expect(slot101Out.votes).toEqual([
      { participantId: 10, status: 'AVAILABLE' },
      { participantId: 11, status: 'AVAILABLE' },
    ]);
    const slot103Out = result.slots.find((s) => s.slotId === 103)!;
    expect(slot103Out.votes).toEqual([]);

    // recommendations — 미응답자(p3)도 NO_RESPONSE 로 명시 포함(완료조건).
    expect(result.recommendations).toEqual([
      {
        recommendationId: 20,
        participantStatuses: [
          { participantId: 10, status: 'AVAILABLE' },
          { participantId: 11, status: 'UNAVAILABLE' },
          { participantId: 12, status: 'NO_RESPONSE' },
        ],
      },
    ]);
  });

  it('모임장이 아니면 403(FORBIDDEN_MEETING_OWNER_ONLY)을 던진다', async () => {
    const prisma = makeVoteDetailsFakePrisma(
      { id: 1, ownerId: OWNER_ID },
      [],
      [],
      [],
      [],
    );
    const service = new MeetingsService(
      prisma,
      {} as unknown as RecommendationsService,
    );

    await expect(service.getVoteDetails(1, 999)).rejects.toMatchObject({
      code: 'FORBIDDEN_MEETING_OWNER_ONLY',
    });
  });

  it('존재하지 않는 모임이면 404(MEETING_NOT_FOUND)를 던진다', async () => {
    const prisma = makeVoteDetailsFakePrisma(null, [], [], [], []);
    const service = new MeetingsService(
      prisma,
      {} as unknown as RecommendationsService,
    );

    await expect(service.getVoteDetails(999, OWNER_ID)).rejects.toMatchObject({
      code: 'MEETING_NOT_FOUND',
    });
  });
});
