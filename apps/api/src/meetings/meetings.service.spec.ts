import { MeetingCategory } from '@whenwe/types';
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
