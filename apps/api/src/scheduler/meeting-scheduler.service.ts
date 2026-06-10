import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MeetingStatus } from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';

// 상태 전환 스케줄러 — 응답 마감(responseDeadline)이 지난 COLLECTING 모임을
// READY_TO_CONFIRM 으로 자동 전환한다. 자동 확정(CONFIRMED)은 하지 않는다
// (모임장 수동 확정). docs/domain.md 모임 상태머신 참조.
@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredMeetings(): Promise<void> {
    try {
      const transitioned = await this.transitionExpiredMeetings();
      if (transitioned > 0) {
        this.logger.log(
          `마감 경과 모임 ${transitioned}건 → READY_TO_CONFIRM 전환`,
        );
      }
    } catch (e) {
      // 틱 전체가 실패해도 다음 틱(5분 후)에 재시도된다.
      this.logger.error(
        '마감 전환 스케줄러 실행 실패',
        e instanceof Error ? e.stack : String(e),
      );
    }
  }

  // 마감이 지난 COLLECTING 모임을 READY_TO_CONFIRM 으로 전환하고 전환 건수를 반환.
  // now 를 주입 가능하게 분리해 테스트·수동 트리거가 쉽도록 한다.
  // 각 모임을 조건부 updateMany(status=COLLECTING) 로 전환해 동시 confirm 과의
  // 경합에서 안전하며, count===1 일 때만 state log 를 남겨 멱등성을 보장한다.
  async transitionExpiredMeetings(now: Date = new Date()): Promise<number> {
    const expired = await this.prisma.meeting.findMany({
      where: {
        status: MeetingStatus.COLLECTING,
        responseDeadline: { lte: now },
      },
      select: { id: true },
    });

    let transitioned = 0;
    for (const { id } of expired) {
      try {
        const did = await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.meeting.updateMany({
            where: { id, status: MeetingStatus.COLLECTING },
            data: { status: MeetingStatus.READY_TO_CONFIRM },
          });
          if (count === 0) {
            // 그 사이 다른 경로(수동 확정 등)로 상태가 바뀜 — 건너뛴다.
            return false;
          }
          await tx.meetingStateLog.create({
            data: {
              meetingId: id,
              previousStatus: MeetingStatus.COLLECTING,
              nextStatus: MeetingStatus.READY_TO_CONFIRM,
              reason: 'deadline_passed',
            },
          });
          return true;
        });
        if (did) transitioned += 1;
      } catch (e) {
        // 한 모임 전환 실패가 나머지 마감 모임 처리를 막지 않도록 격리. 다음 틱에 재시도.
        this.logger.error(
          `모임 ${id} 상태 전환 실패`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }

    return transitioned;
  }
}
