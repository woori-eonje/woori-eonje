import { MeetingCategory } from '@whenwe/types';
import type { CreateMeetingRequest } from '@whenwe/types';
import { MeetingsService } from './meetings.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RecommendationsService } from '../recommendations/recommendations.service';

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

function baseBody(
  overrides: Partial<CreateMeetingRequest> = {},
): CreateMeetingRequest {
  return {
    title: '조율 기간 테스트',
    category: MeetingCategory.FRIEND,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    availableStartTime: '09:00',
    availableEndTime: '10:00',
    durationHours: 1,
    responseDeadline: '2026-09-30T20:00:00+09:00',
    ...overrides,
  };
}

describe('MeetingsService.createMeeting — 조율 기간 최대 30일', () => {
  it('30일짜리 기간(경계값)은 통과한다', async () => {
    const service = new MeetingsService(
      makeFakePrisma(),
      {} as unknown as RecommendationsService,
    );

    const result = await service.createMeeting(1, baseBody());

    expect(result.meetingId).toBe(1);
  });

  it('31일짜리 기간은 거부한다', async () => {
    const service = new MeetingsService(
      makeFakePrisma(),
      {} as unknown as RecommendationsService,
    );

    await expect(
      service.createMeeting(
        1,
        baseBody({ startDate: '2026-09-01', endDate: '2026-10-01' }),
      ),
    ).rejects.toThrow('조율 기간은 최대 30일입니다.');
  });
});
