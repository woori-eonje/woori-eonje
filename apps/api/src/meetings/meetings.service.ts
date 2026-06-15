import { randomUUID } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AggregateResponse,
  AvailabilityStatus,
  type ConfirmResult,
  type CreateMeetingRequest,
  ErrorCode,
  MeetingCategory,
  type MeetingCreated,
  type MeetingDetail,
  MeetingStatus,
  type MeetingSummary,
  type Participant,
  type ParticipantsResponse,
} from '@whenwe/types';
import { DomainException } from '../common/domain-exception';
import { assertMeetingOwner, meetingNotFound } from '../common/meeting-access';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { buildICS } from './ics';
import { expandDateRange, generateSlots } from './slot-generation';

const MAX_PERIOD_DAYS = 14;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // POST /api/meetings — JWT 필요. 모임 + 슬롯 + invite_token 을 한 트랜잭션으로 생성.
  async createMeeting(
    ownerId: number,
    body: CreateMeetingRequest,
  ): Promise<MeetingCreated> {
    const input = this.validate(body);

    const [startHour] = input.availableStartTime.split(':').map(Number);
    const [endHour] = input.availableEndTime.split(':').map(Number);
    // 특정 날짜가 주어지면 그 날짜들만, 아니면 전체 범위를 펼쳐 슬롯 생성.
    const dates =
      input.dates ?? expandDateRange(input.startDate, input.endDate);
    const slots = generateSlots(dates, startHour, endHour);

    const inviteToken = randomUUID();
    const responseDeadline = new Date(input.responseDeadline);

    const meeting = await this.prisma.$transaction(async (tx) => {
      const created = await tx.meeting.create({
        data: {
          ownerId,
          title: input.title,
          description: input.description,
          category: input.category,
          status: MeetingStatus.COLLECTING,
          // @db.Date 컬럼 — 날짜만 저장. UTC 자정으로 넣어야 toISOString().slice(0,10)
          // 으로 읽을 때 같은 날짜가 나온다(seed/invites 읽기 경로와 일관).
          startDate: new Date(`${input.startDate}T00:00:00Z`),
          endDate: new Date(`${input.endDate}T00:00:00Z`),
          availableStartTime: input.availableStartTime,
          availableEndTime: input.availableEndTime,
          durationHours: input.durationHours,
          responseDeadline,
          inviteToken,
          inviteTokenExpiresAt: responseDeadline,
        },
      });

      await tx.availabilitySlot.createMany({
        data: slots.map((slot) => ({
          meetingId: created.id,
          slotStartAt: slot.slotStartAt,
          slotEndAt: slot.slotEndAt,
        })),
      });

      await tx.meetingStateLog.create({
        data: {
          meetingId: created.id,
          previousStatus: null,
          nextStatus: MeetingStatus.COLLECTING,
          reason: 'created',
        },
      });

      return created;
    });

    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

    return {
      meetingId: meeting.id,
      title: meeting.title,
      status: meeting.status,
      inviteUrl: `${webBaseUrl}/invite/${meeting.inviteToken}`,
    };
  }

  // PATCH /api/meetings/:meetingId — JWT + 모임장 소유. 응답자 0명일 때만 수정 허용.
  // 생성과 동일 필드를 전체 교체하고, 슬롯을 재생성한다(응답자 0명이라 보존할 가용성 없음).
  // 스테일 추천결과도 정리. validate()/generateSlots 를 createMeeting 과 그대로 공유.
  async updateMeeting(
    meetingId: number,
    userId: number,
    body: CreateMeetingRequest,
  ): Promise<MeetingDetail> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true, status: true },
    });
    assertMeetingOwner(meeting, userId);

    // 수정은 수집 중(COLLECTING)일 때만 — 도메인의 "상태별 액션 강제 제한".
    // 마감이 지나 READY_TO_CONFIRM 으로 전환됐거나 확정/마감된 모임은 응답자 0명이어도
    // 수정 불가(종료된 모임을 미래 마감으로 재오픈하는 것을 막는다).
    if (meeting.status !== MeetingStatus.COLLECTING) {
      throw new DomainException(
        ErrorCode.MEETING_NOT_EDITABLE,
        HttpStatus.CONFLICT,
        '수집 중인 모임만 수정할 수 있습니다.',
      );
    }

    const input = this.validate(body);
    const [startHour] = input.availableStartTime.split(':').map(Number);
    const [endHour] = input.availableEndTime.split(':').map(Number);
    const dates =
      input.dates ?? expandDateRange(input.startDate, input.endDate);
    const slots = generateSlots(dates, startHour, endHour);
    const responseDeadline = new Date(input.responseDeadline);

    // 응답 존재 검사를 트랜잭션 안에서 재확인한다 — 가드와 슬롯 재생성 사이에 응답이
    // 들어오면 deleteMany 의 cascade 로 그 응답이 소리 없이 삭제될 수 있어, 같은
    // 트랜잭션에서 다시 확인하고 있으면 롤백한다(confirmMeeting 의 경합 방어와 정합).
    await this.prisma.$transaction(async (tx) => {
      const existingResponse = await tx.participantAvailability.findFirst({
        where: { meetingId },
        select: { id: true },
      });
      if (existingResponse) {
        throw new DomainException(
          ErrorCode.RESPONSE_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
          '이미 응답한 참여자가 있어 모임을 수정할 수 없습니다.',
        );
      }

      await tx.meeting.update({
        where: { id: meetingId },
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          startDate: new Date(`${input.startDate}T00:00:00Z`),
          endDate: new Date(`${input.endDate}T00:00:00Z`),
          availableStartTime: input.availableStartTime,
          availableEndTime: input.availableEndTime,
          durationHours: input.durationHours,
          responseDeadline,
          // 초대 토큰 만료는 마감과 동기화(생성 로직과 동일 정책).
          inviteTokenExpiresAt: responseDeadline,
        },
      });
      // 슬롯 전면 재생성(응답자 0명이라 cascade 로 지워질 가용성 행이 없음).
      await tx.availabilitySlot.deleteMany({ where: { meetingId } });
      await tx.availabilitySlot.createMany({
        data: slots.map((slot) => ({
          meetingId,
          slotStartAt: slot.slotStartAt,
          slotEndAt: slot.slotEndAt,
        })),
      });
      // 슬롯이 바뀌면 기존 추천결과는 스테일 — 정리(다음 응답 제출 시 재계산).
      await tx.recommendationResult.deleteMany({ where: { meetingId } });
    });

    return this.getMeeting(meetingId, userId);
  }

  // GET /api/meetings — JWT 필요. 로그인 사용자가 owner 인 모임만 목록 반환.
  async listMyMeetings(ownerId: number): Promise<MeetingSummary[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        startDate: true,
        endDate: true,
        responseDeadline: true,
        _count: { select: { participants: true } },
      },
    });

    // respondedCount(가능시간을 1개라도 제출한 참여자 수)는 모임별 distinct 참여자 집계.
    // N+1 을 피해 한 번의 쿼리로 모든 모임의 (meetingId, participantId) distinct 를 받아 JS 에서 센다.
    const meetingIds = meetings.map((m) => m.id);
    const respondedRows =
      meetingIds.length === 0
        ? []
        : await this.prisma.participantAvailability.findMany({
            where: { meetingId: { in: meetingIds } },
            distinct: ['meetingId', 'participantId'],
            select: { meetingId: true },
          });
    const respondedByMeeting = new Map<number, number>();
    for (const r of respondedRows) {
      respondedByMeeting.set(
        r.meetingId,
        (respondedByMeeting.get(r.meetingId) ?? 0) + 1,
      );
    }

    return meetings.map((m) => ({
      meetingId: m.id,
      title: m.title,
      status: m.status,
      category: m.category,
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
      responseDeadline: m.responseDeadline.toISOString(),
      participantCount: m._count.participants,
      respondedCount: respondedByMeeting.get(m.id) ?? 0,
    }));
  }

  // GET /api/meetings/:meetingId — JWT 필요 + 모임장 소유 검증(공유 assertMeetingOwner).
  async getMeeting(meetingId: number, userId: number): Promise<MeetingDetail> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { _count: { select: { participants: true } } },
    });
    assertMeetingOwner(meeting, userId);

    // respondedCount: 가능시간을 1개라도 제출한 distinct 참여자 수.
    const responded = await this.prisma.participantAvailability.findMany({
      where: { meetingId },
      distinct: ['participantId'],
      select: { participantId: true },
    });

    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

    return {
      meetingId: meeting.id,
      title: meeting.title,
      status: meeting.status,
      category: meeting.category,
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      responseDeadline: meeting.responseDeadline.toISOString(),
      description: meeting.description,
      availableStartTime: meeting.availableStartTime,
      availableEndTime: meeting.availableEndTime,
      durationHours: meeting.durationHours,
      inviteUrl: `${webBaseUrl}/invite/${meeting.inviteToken}`,
      confirmedStartAt: meeting.confirmedStartAt
        ? meeting.confirmedStartAt.toISOString()
        : null,
      confirmedEndAt: meeting.confirmedEndAt
        ? meeting.confirmedEndAt.toISOString()
        : null,
      participantCount: meeting._count.participants,
      respondedCount: responded.length,
    };
  }

  // GET /api/meetings/:meetingId/participants — JWT + 모임장 소유. 필수참석자 지정 화면용.
  async listParticipants(
    meetingId: number,
    userId: number,
  ): Promise<ParticipantsResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true },
    });
    assertMeetingOwner(meeting, userId);

    const participants = await this.prisma.participant.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        guestName: true,
        participantType: true,
        isRequired: true,
      },
    });

    // 응답(가능시간 1개라도 제출)한 participantId 집합 — 단일 distinct 쿼리.
    const responded = await this.prisma.participantAvailability.findMany({
      where: { meetingId },
      distinct: ['participantId'],
      select: { participantId: true },
    });
    const respondedSet = new Set(responded.map((r) => r.participantId));

    return {
      participants: participants.map((p) => ({
        participantId: p.id,
        guestName: p.guestName,
        participantType: p.participantType,
        isRequired: p.isRequired,
        hasResponded: respondedSet.has(p.id),
      })),
    };
  }

  // DELETE /api/meetings/:meetingId — JWT + 모임장 소유. 상태 무관 언제든 삭제.
  // 참여자·슬롯·가능시간·추천결과·상태로그는 스키마 onDelete Cascade 로 연쇄 삭제된다.
  async deleteMeeting(
    meetingId: number,
    userId: number,
  ): Promise<Record<string, never>> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true },
    });
    assertMeetingOwner(meeting, userId);

    // findUnique 와 delete 사이에 다른 요청이 먼저 삭제하면 Prisma 가 P2025(행 없음)를
    // 던진다 — 계약 외 500 대신 404 로 변환(경합 idempotent 처리). auth 의 P2002 판별과 동일 방식.
    try {
      await this.prisma.meeting.delete({ where: { id: meetingId } });
    } catch (e) {
      if (this.isRecordNotFound(e)) {
        throw meetingNotFound();
      }
      throw e;
    }

    return {};
  }

  // Prisma 레코드 부재(P2025) 판별 — auth.service 의 isUniqueViolation 과 같은 duck-typing.
  private isRecordNotFound(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: unknown }).code === 'P2025'
    );
  }

  // GET /api/meetings/:meetingId/aggregate — JWT + 모임장 소유. 응답 현황 히트맵용.
  // 슬롯별 가능/애매/불가 카운트. 추천 엔진의 window 단위 집계와 달리 개별 1시간 슬롯
  // 단위라 엔진 로직을 재사용하지 않고 (slotId, status) groupBy 로 직접 집계한다.
  async getAggregate(
    meetingId: number,
    userId: number,
  ): Promise<AggregateResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true },
    });
    assertMeetingOwner(meeting, userId);

    const [slots, grouped] = await Promise.all([
      this.prisma.availabilitySlot.findMany({
        where: { meetingId },
        orderBy: { slotStartAt: 'asc' },
        select: { id: true, slotStartAt: true },
      }),
      this.prisma.participantAvailability.groupBy({
        by: ['slotId', 'availabilityStatus'],
        where: { meetingId },
        _count: { _all: true },
      }),
    ]);

    // (slotId -> 상태별 카운트) 누적. 응답 없는 슬롯은 아래 map 에서 0 으로 채워진다.
    const countsBySlot = new Map<
      number,
      { available: number; maybe: number; unavailable: number }
    >();
    for (const g of grouped) {
      const entry = countsBySlot.get(g.slotId) ?? {
        available: 0,
        maybe: 0,
        unavailable: 0,
      };
      const count = g._count._all;
      if (g.availabilityStatus === AvailabilityStatus.AVAILABLE) {
        entry.available = count;
      } else if (g.availabilityStatus === AvailabilityStatus.MAYBE) {
        entry.maybe = count;
      } else {
        entry.unavailable = count;
      }
      countsBySlot.set(g.slotId, entry);
    }

    return {
      meetingId,
      slots: slots.map((s) => {
        const c = countsBySlot.get(s.id);
        return {
          slotId: s.id,
          startAt: s.slotStartAt.toISOString(),
          availableCount: c?.available ?? 0,
          maybeCount: c?.maybe ?? 0,
          unavailableCount: c?.unavailable ?? 0,
        };
      }),
    };
  }

  // PATCH /api/meetings/:meetingId/participants/:participantId — JWT + 모임장 소유.
  // is_required 변경 후 추천 재계산(8단계 ①에 영향).
  async setParticipantRequired(
    meetingId: number,
    participantId: number,
    userId: number,
    isRequired: boolean,
  ): Promise<Participant> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true },
    });
    assertMeetingOwner(meeting, userId);

    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, meetingId: true },
    });
    // 존재하지 않거나, 이 모임 소속이 아니면 404.
    if (!participant || participant.meetingId !== meetingId) {
      throw meetingNotFound();
    }

    const updated = await this.prisma.participant.update({
      where: { id: participantId },
      data: { isRequired },
      select: {
        id: true,
        guestName: true,
        participantType: true,
        isRequired: true,
      },
    });

    // 필수참석자 변경 → 추천 결과 재계산.
    await this.recommendationsService.recompute(meetingId);

    return {
      participantId: updated.id,
      guestName: updated.guestName,
      participantType: updated.participantType,
      isRequired: updated.isRequired,
    };
  }

  // POST /api/meetings/:meetingId/confirm — JWT + 모임장 소유.
  // 추천 결과 1개를 골라 모임을 CONFIRMED 로 확정한다. 확정 시각은 추천 행의
  // start/end 를 스냅샷으로 복사(이후 추천 재계산돼도 불변). 중복 확정 방지는
  // 상태 조건부 updateMany(count) 로 보장. 2~4 를 한 트랜잭션으로 원자 처리.
  async confirmMeeting(
    meetingId: number,
    userId: number,
    recommendationId: number,
  ): Promise<ConfirmResult> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, ownerId: true, status: true },
    });
    assertMeetingOwner(meeting, userId);

    // 사전 status 체크 — 흔한 재확정 케이스를 트랜잭션 전에 409 로 빠르게 거부.
    if (
      meeting.status !== MeetingStatus.COLLECTING &&
      meeting.status !== MeetingStatus.READY_TO_CONFIRM
    ) {
      throw this.meetingAlreadyConfirmed();
    }
    const previousStatus = meeting.status;

    return this.prisma.$transaction(async (tx) => {
      const recommendation = await tx.recommendationResult.findUnique({
        where: { id: recommendationId },
        select: { id: true, meetingId: true, startAt: true, endAt: true },
      });
      // 없거나 이 모임의 추천이 아니면 404.
      if (!recommendation || recommendation.meetingId !== meetingId) {
        throw meetingNotFound();
      }

      // 상태 조건부 UPDATE — COLLECTING/READY_TO_CONFIRM 일 때만 CONFIRMED 로.
      // count===0 이면 그 사이 이미 확정/마감됐다는 뜻(경합) → 409.
      const { count } = await tx.meeting.updateMany({
        where: {
          id: meetingId,
          status: {
            in: [MeetingStatus.COLLECTING, MeetingStatus.READY_TO_CONFIRM],
          },
        },
        data: {
          status: MeetingStatus.CONFIRMED,
          confirmedStartAt: recommendation.startAt,
          confirmedEndAt: recommendation.endAt,
        },
      });
      if (count === 0) {
        throw this.meetingAlreadyConfirmed();
      }

      await tx.meetingStateLog.create({
        data: {
          meetingId,
          previousStatus,
          nextStatus: MeetingStatus.CONFIRMED,
          reason: 'confirmed',
        },
      });

      return {
        meetingId,
        status: MeetingStatus.CONFIRMED,
        confirmedStartAt: recommendation.startAt.toISOString(),
        confirmedEndAt: recommendation.endAt.toISOString(),
      };
    });
  }

  // GET /api/meetings/:meetingId/calendar.ics — JWT + 모임장 소유.
  // 확정(CONFIRMED + confirmed* 존재)된 모임만 .ics 텍스트를 반환한다. 미확정이면 409.
  async downloadCalendar(meetingId: number, userId: number): Promise<string> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
        description: true,
        confirmedStartAt: true,
        confirmedEndAt: true,
      },
    });
    assertMeetingOwner(meeting, userId);

    if (
      meeting.status !== MeetingStatus.CONFIRMED ||
      !meeting.confirmedStartAt ||
      !meeting.confirmedEndAt
    ) {
      throw new DomainException(
        ErrorCode.MEETING_NOT_CONFIRMED,
        HttpStatus.CONFLICT,
        '아직 확정되지 않은 모임입니다.',
      );
    }

    return buildICS({
      meetingId: meeting.id,
      title: meeting.title,
      description: meeting.description,
      startAt: meeting.confirmedStartAt,
      endAt: meeting.confirmedEndAt,
    });
  }

  private meetingAlreadyConfirmed(): DomainException {
    return new DomainException(
      ErrorCode.MEETING_ALREADY_CONFIRMED,
      HttpStatus.CONFLICT,
      '이미 확정된 모임입니다.',
    );
  }

  // ── 수동 검증 (invites/auth 선례처럼 서비스 내에서 BadRequestException) ──
  private validate(body: CreateMeetingRequest): {
    title: string;
    description: string | null;
    category: MeetingCategory;
    startDate: string;
    endDate: string;
    availableStartTime: string;
    availableEndTime: string;
    durationHours: number;
    responseDeadline: string;
    dates?: string[];
  } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('요청 본문이 올바르지 않습니다.');
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 100) {
      throw new BadRequestException('제목은 1~100자여야 합니다.');
    }

    let description: string | null = null;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        throw new BadRequestException('설명 형식이 올바르지 않습니다.');
      }
      if (body.description.length > 500) {
        throw new BadRequestException('설명은 500자 이하여야 합니다.');
      }
      description = body.description;
    }

    if (!Object.values(MeetingCategory).includes(body.category)) {
      throw new BadRequestException('모임 성격(category)이 올바르지 않습니다.');
    }

    if (
      typeof body.startDate !== 'string' ||
      !DATE_PATTERN.test(body.startDate) ||
      Number.isNaN(Date.parse(`${body.startDate}T00:00:00+09:00`))
    ) {
      throw new BadRequestException(
        '시작일 형식(YYYY-MM-DD)이 올바르지 않습니다.',
      );
    }
    if (
      typeof body.endDate !== 'string' ||
      !DATE_PATTERN.test(body.endDate) ||
      Number.isNaN(Date.parse(`${body.endDate}T00:00:00+09:00`))
    ) {
      throw new BadRequestException(
        '종료일 형식(YYYY-MM-DD)이 올바르지 않습니다.',
      );
    }

    const startMs = Date.parse(`${body.startDate}T00:00:00+09:00`);
    const endMs = Date.parse(`${body.endDate}T00:00:00+09:00`);
    if (startMs > endMs) {
      throw new BadRequestException('시작일은 종료일보다 늦을 수 없습니다.');
    }
    // 양끝 포함 일수.
    const periodDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
    if (periodDays > MAX_PERIOD_DAYS) {
      throw new BadRequestException(
        `조율 기간은 최대 ${MAX_PERIOD_DAYS}일입니다.`,
      );
    }

    // 특정 날짜 목록(선택). 있으면 범위 안의 부분집합이어야 하고 형식·중복을 검증한다.
    let dates: string[] | undefined;
    if (body.dates !== undefined && body.dates !== null) {
      if (!Array.isArray(body.dates) || body.dates.length === 0) {
        throw new BadRequestException(
          'dates 는 비어 있지 않은 날짜 배열이어야 합니다.',
        );
      }
      const seen = new Set<string>();
      for (const d of body.dates) {
        if (
          typeof d !== 'string' ||
          !DATE_PATTERN.test(d) ||
          Number.isNaN(Date.parse(`${d}T00:00:00+09:00`))
        ) {
          throw new BadRequestException(
            'dates 항목 형식(YYYY-MM-DD)이 올바르지 않습니다.',
          );
        }
        const dMs = Date.parse(`${d}T00:00:00+09:00`);
        if (dMs < startMs || dMs > endMs) {
          throw new BadRequestException(
            'dates 는 시작일~종료일 범위 안이어야 합니다.',
          );
        }
        if (seen.has(d)) {
          throw new BadRequestException('dates 에 중복된 날짜가 있습니다.');
        }
        seen.add(d);
      }
      dates = body.dates;
    }

    if (
      typeof body.availableStartTime !== 'string' ||
      !TIME_PATTERN.test(body.availableStartTime)
    ) {
      throw new BadRequestException(
        '가능 시작 시각(HH:mm)이 올바르지 않습니다.',
      );
    }
    if (
      typeof body.availableEndTime !== 'string' ||
      !TIME_PATTERN.test(body.availableEndTime)
    ) {
      throw new BadRequestException(
        '가능 종료 시각(HH:mm)이 올바르지 않습니다.',
      );
    }

    const [startHour, startMin] = body.availableStartTime
      .split(':')
      .map(Number);
    const [endHour, endMin] = body.availableEndTime.split(':').map(Number);
    if (startMin !== 0 || endMin !== 0) {
      throw new BadRequestException('가능 시각은 정시(분=00)여야 합니다.');
    }
    if (startHour >= endHour) {
      throw new BadRequestException(
        '가능 시작 시각은 종료 시각보다 빨라야 합니다.',
      );
    }

    if (
      typeof body.durationHours !== 'number' ||
      !Number.isInteger(body.durationHours) ||
      body.durationHours < 1 ||
      body.durationHours > 12
    ) {
      throw new BadRequestException(
        '예상 소요 시간은 1~12시간 정수여야 합니다.',
      );
    }
    const windowHours = endHour - startHour;
    if (body.durationHours > windowHours) {
      throw new BadRequestException(
        '예상 소요 시간이 하루 가능시간 창보다 길어 후보 구간이 만들어지지 않습니다.',
      );
    }

    // 마감은 타임존 오프셋(Z 또는 ±HH:MM)이 포함된 ISO date-time 이어야 한다.
    // 오프셋이 없으면 서버 로컬 TZ로 해석돼 KST 기준 상·하한과 어긋나므로 거부한다.
    if (
      typeof body.responseDeadline !== 'string' ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(body.responseDeadline) ||
      Number.isNaN(Date.parse(body.responseDeadline))
    ) {
      throw new BadRequestException(
        '응답 마감 시각은 타임존 오프셋을 포함한 ISO date-time 이어야 합니다.',
      );
    }
    const deadlineMs = Date.parse(body.responseDeadline);
    // 하한: 마감은 미래여야 한다(이미 지난 마감이면 응답을 받을 수 없는 무의미한 모임).
    if (deadlineMs <= Date.now()) {
      throw new BadRequestException('응답 마감은 현재 시각 이후여야 합니다.');
    }
    // 상한: 마감은 조율 종료일의 끝(다음날 00:00 KST)보다 늦을 수 없다.
    const endOfEndDateMs = endMs + MS_PER_DAY;
    if (deadlineMs > endOfEndDateMs) {
      throw new BadRequestException(
        '응답 마감은 조율 종료일보다 이르거나 같아야 합니다.',
      );
    }

    return {
      title,
      description,
      category: body.category,
      startDate: body.startDate,
      endDate: body.endDate,
      availableStartTime: body.availableStartTime,
      availableEndTime: body.availableEndTime,
      durationHours: body.durationHours,
      responseDeadline: body.responseDeadline,
      dates,
    };
  }
}
