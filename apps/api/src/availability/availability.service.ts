import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AvailabilityStatus,
  ErrorCode,
  type MyAvailability,
  type SlotsResponse,
  type SubmitAvailabilityRequest,
  type SubmitAvailabilityResponse,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/meetings/:meetingId/slots — 인증 불필요
  async listSlots(meetingId: number): Promise<SlotsResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw this.meetingNotFound();
    }

    const slots = await this.prisma.availabilitySlot.findMany({
      where: { meetingId },
      orderBy: { slotStartAt: 'asc' },
    });

    return {
      meetingId,
      slots: slots.map((slot) => ({
        slotId: slot.id,
        startAt: slot.slotStartAt.toISOString(),
        endAt: slot.slotEndAt.toISOString(),
      })),
    };
  }

  // POST /api/meetings/:meetingId/availability — X-Participant-Edit-Token 인증
  async submitAvailability(
    meetingId: number,
    editToken: string | undefined,
    body: SubmitAvailabilityRequest,
  ): Promise<SubmitAvailabilityResponse> {
    const participant = await this.authenticateParticipant(
      meetingId,
      editToken,
    );

    // body.participantId 는 토큰의 participant 와 일치해야 한다.
    if (body?.participantId !== participant.id) {
      throw this.tokenInvalid();
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw this.meetingNotFound();
    }

    // 응답 수집(COLLECTING) 중일 때만 제출 가능. 마감/확정 이후는 거부.
    if (meeting.status !== 'COLLECTING') {
      throw new DomainException(
        ErrorCode.RESPONSE_DEADLINE_PASSED,
        HttpStatus.CONFLICT,
        '응답을 받을 수 있는 기간이 아닙니다.',
      );
    }

    // 요청 본문 검증 (잘못된 status/slotId 가 Prisma 까지 새어 5xx 되는 것을 막는다).
    const items = body?.items;
    if (!Array.isArray(items)) {
      throw new BadRequestException('items 형식이 올바르지 않습니다.');
    }
    const validStatuses = new Set<string>(Object.values(AvailabilityStatus));
    for (const item of items) {
      if (!Number.isInteger(item?.slotId) || !validStatuses.has(item?.status)) {
        throw new BadRequestException(
          '가능시간 항목 형식이 올바르지 않습니다.',
        );
      }
    }

    // 제출된 slotId 들이 모두 이 모임의 슬롯인지 검증.
    const submittedSlotIds = [...new Set(items.map((item) => item.slotId))];
    if (submittedSlotIds.length > 0) {
      const validSlots = await this.prisma.availabilitySlot.findMany({
        where: { id: { in: submittedSlotIds }, meetingId },
        select: { id: true },
      });
      if (validSlots.length !== submittedSlotIds.length) {
        throw this.meetingNotFound();
      }
    }

    // 제출 = 이 참여자 응답의 스냅샷 교체. 한 트랜잭션에서:
    //  ① 이번에 빠진 기존 슬롯 삭제(화면에서 해제한 슬롯 반영) → ② 제출분 upsert.
    await this.prisma.$transaction([
      this.prisma.participantAvailability.deleteMany({
        where: {
          participantId: participant.id,
          slotId: { notIn: submittedSlotIds },
        },
      }),
      ...items.map((item) =>
        this.prisma.participantAvailability.upsert({
          where: {
            participantId_slotId: {
              participantId: participant.id,
              slotId: item.slotId,
            },
          },
          create: {
            meetingId,
            participantId: participant.id,
            slotId: item.slotId,
            availabilityStatus: item.status,
          },
          update: {
            availabilityStatus: item.status,
          },
        }),
      ),
    ]);

    // 추천 재계산은 이번 범위(슬라이스 3)가 아님 — 항상 false.
    return { saved: true, updatedRecommendation: false };
  }

  // GET /api/meetings/:meetingId/availability/me — X-Participant-Edit-Token 인증
  async getMyAvailability(
    meetingId: number,
    editToken: string | undefined,
  ): Promise<MyAvailability> {
    const participant = await this.authenticateParticipant(
      meetingId,
      editToken,
    );

    const availabilities = await this.prisma.participantAvailability.findMany({
      where: { participantId: participant.id },
      orderBy: { slotId: 'asc' },
    });

    return {
      participantId: participant.id,
      guestName: participant.guestName,
      items: availabilities.map((row) => ({
        slotId: row.slotId,
        status: row.availabilityStatus,
      })),
    };
  }

  // 토큰으로 participant 를 조회하고, 경로 meetingId 와 일치하는지 확인한다.
  private async authenticateParticipant(
    meetingId: number,
    editToken: string | undefined,
  ) {
    const token = editToken?.trim();
    if (!token) {
      throw this.tokenInvalid();
    }

    const participant = await this.prisma.participant.findUnique({
      where: { editToken: token },
    });
    // 토큰 무효 또는 다른 모임의 참여자면 동일하게 401 취급.
    if (!participant || participant.meetingId !== meetingId) {
      throw this.tokenInvalid();
    }

    return participant;
  }

  private meetingNotFound(): DomainException {
    return new DomainException(
      ErrorCode.MEETING_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      '모임을 찾을 수 없습니다.',
    );
  }

  private tokenInvalid(): DomainException {
    return new DomainException(
      ErrorCode.PARTICIPANT_EDIT_TOKEN_INVALID,
      HttpStatus.UNAUTHORIZED,
      '유효하지 않은 참여자 토큰입니다.',
    );
  }
}
