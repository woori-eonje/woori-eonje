import { Injectable } from '@nestjs/common';
import {
  type Recommendation,
  type RecommendationsResponse,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { assertMeetingOwner, meetingNotFound } from '../common/meeting-access';
import {
  computeRecommendations,
  type EngineInput,
} from './recommendation.engine';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // 응답 제출/필수참여자 변경 시 호출: 모임 데이터 로드 → 엔진 → recommendation_results 교체.
  // 트랜잭션: 해당 meeting 기존 행 deleteMany → top5 insert. (meetingId, rank) unique 준수.
  async recompute(meetingId: number): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, durationHours: true },
    });
    if (!meeting) {
      throw meetingNotFound();
    }

    const [slots, participants, responses] = await Promise.all([
      this.prisma.availabilitySlot.findMany({
        where: { meetingId },
        orderBy: { slotStartAt: 'asc' },
        select: { id: true, slotStartAt: true, slotEndAt: true },
      }),
      this.prisma.participant.findMany({
        where: { meetingId },
        select: { id: true, isRequired: true },
      }),
      this.prisma.participantAvailability.findMany({
        where: { meetingId },
        select: { participantId: true, slotId: true, availabilityStatus: true },
      }),
    ]);

    const input: EngineInput = {
      durationHours: meeting.durationHours,
      slots: slots.map((s) => ({
        id: s.id,
        slotStartAt: s.slotStartAt.toISOString(),
        slotEndAt: s.slotEndAt.toISOString(),
      })),
      participants,
      responses,
    };

    const ranked = computeRecommendations(input);

    // 기존 결과 삭제 후 top5 삽입을 한 트랜잭션으로.
    await this.prisma.$transaction([
      this.prisma.recommendationResult.deleteMany({ where: { meetingId } }),
      ...(ranked.length > 0
        ? [
            this.prisma.recommendationResult.createMany({
              data: ranked.map((c) => ({
                meetingId,
                rank: c.rank,
                startAt: new Date(c.startAt),
                endAt: new Date(c.endAt),
                availableCount: c.availableCount,
                maybeCount: c.maybeCount,
                unavailableCount: c.unavailableCount,
                requiredAvailableCount: c.requiredAvailableCount,
                requiredMaybeCount: c.requiredMaybeCount,
                requiredUnavailableCount: c.requiredUnavailableCount,
                requiredParticipantSatisfied: c.requiredParticipantSatisfied,
                score: c.score,
              })),
            }),
          ]
        : []),
    ]);
  }

  // GET /api/meetings/:meetingId/recommendations — 저장된 결과만 반환(계산 안 함).
  // 모임장 전용: meeting.ownerId === userId 가 아니면 403.
  async getRecommendations(
    meetingId: number,
    userId: number,
  ): Promise<RecommendationsResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true },
    });
    assertMeetingOwner(meeting, userId);

    const rows = await this.prisma.recommendationResult.findMany({
      where: { meetingId },
      orderBy: { rank: 'asc' },
    });

    const recommendations: Recommendation[] = rows.map((r) => ({
      rank: r.rank,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      availableCount: r.availableCount,
      maybeCount: r.maybeCount,
      unavailableCount: r.unavailableCount,
      requiredAvailableCount: r.requiredAvailableCount,
      requiredMaybeCount: r.requiredMaybeCount,
      requiredUnavailableCount: r.requiredUnavailableCount,
      requiredParticipantSatisfied: r.requiredParticipantSatisfied,
      score: r.score,
    }));

    return { meetingId, recommendations };
  }
}
