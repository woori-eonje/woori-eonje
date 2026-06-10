import { MeetingStatus } from '@whenwe/types';
import { MeetingSchedulerService } from './meeting-scheduler.service';
import type { PrismaService } from '../prisma/prisma.service';

// 인메모리 가짜 Prisma — 마감 전환 로직(조회 필터·조건부 update·state log·멱등)을
// DB 없이 검증한다. meeting.status / responseDeadline 만 모델링.
function makeFakePrisma(
  meetings: Array<{ id: number; status: MeetingStatus; deadline: Date }>,
) {
  const stateLogs: Array<{
    meetingId: number;
    previousStatus: MeetingStatus;
    nextStatus: MeetingStatus;
    reason: string;
  }> = [];

  const tx = {
    meeting: {
      updateMany: ({
        where,
        data,
      }: {
        where: { id: number; status: MeetingStatus };
        data: { status: MeetingStatus };
      }) => {
        const m = meetings.find(
          (x) => x.id === where.id && x.status === where.status,
        );
        if (!m) return Promise.resolve({ count: 0 });
        m.status = data.status;
        return Promise.resolve({ count: 1 });
      },
    },
    meetingStateLog: {
      create: ({
        data,
      }: {
        data: {
          meetingId: number;
          previousStatus: MeetingStatus;
          nextStatus: MeetingStatus;
          reason: string;
        };
      }) => {
        stateLogs.push(data);
        return Promise.resolve(data);
      },
    },
  };

  const prisma = {
    meeting: {
      findMany: ({
        where,
      }: {
        where: {
          status: MeetingStatus;
          responseDeadline: { lte: Date };
        };
      }) =>
        Promise.resolve(
          meetings
            .filter(
              (m) =>
                m.status === where.status &&
                m.deadline.getTime() <= where.responseDeadline.lte.getTime(),
            )
            .map((m) => ({ id: m.id })),
        ),
    },
    $transaction: (fn: (t: typeof tx) => unknown) => Promise.resolve(fn(tx)),
  };

  return { prisma: prisma as unknown as PrismaService, meetings, stateLogs };
}

describe('MeetingSchedulerService.transitionExpiredMeetings', () => {
  const now = new Date('2026-06-10T00:00:00.000Z');
  const past = new Date('2026-06-09T00:00:00.000Z');
  const future = new Date('2026-06-11T00:00:00.000Z');

  it('마감 경과한 COLLECTING 모임만 READY_TO_CONFIRM 으로 전환하고 로그를 남긴다', async () => {
    const { prisma, meetings, stateLogs } = makeFakePrisma([
      { id: 1, status: MeetingStatus.COLLECTING, deadline: past },
      { id: 2, status: MeetingStatus.COLLECTING, deadline: future },
    ]);
    const service = new MeetingSchedulerService(prisma);

    const count = await service.transitionExpiredMeetings(now);

    expect(count).toBe(1);
    expect(meetings.find((m) => m.id === 1)!.status).toBe(
      MeetingStatus.READY_TO_CONFIRM,
    );
    // 미래 마감 모임은 그대로.
    expect(meetings.find((m) => m.id === 2)!.status).toBe(
      MeetingStatus.COLLECTING,
    );
    expect(stateLogs).toEqual([
      {
        meetingId: 1,
        previousStatus: MeetingStatus.COLLECTING,
        nextStatus: MeetingStatus.READY_TO_CONFIRM,
        reason: 'deadline_passed',
      },
    ]);
  });

  it('이미 READY_TO_CONFIRM/CONFIRMED 인 모임은 마감이 지나도 건드리지 않는다', async () => {
    const { prisma, meetings, stateLogs } = makeFakePrisma([
      { id: 1, status: MeetingStatus.READY_TO_CONFIRM, deadline: past },
      { id: 2, status: MeetingStatus.CONFIRMED, deadline: past },
    ]);
    const service = new MeetingSchedulerService(prisma);

    const count = await service.transitionExpiredMeetings(now);

    expect(count).toBe(0);
    expect(meetings.find((m) => m.id === 1)!.status).toBe(
      MeetingStatus.READY_TO_CONFIRM,
    );
    expect(meetings.find((m) => m.id === 2)!.status).toBe(
      MeetingStatus.CONFIRMED,
    );
    expect(stateLogs).toHaveLength(0);
  });

  it('멱등: 두 번 실행해도 재전환·중복 로그가 없다', async () => {
    const { prisma, stateLogs } = makeFakePrisma([
      { id: 1, status: MeetingStatus.COLLECTING, deadline: past },
    ]);
    const service = new MeetingSchedulerService(prisma);

    const first = await service.transitionExpiredMeetings(now);
    const second = await service.transitionExpiredMeetings(now);

    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(stateLogs).toHaveLength(1);
  });
});
