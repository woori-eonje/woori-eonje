import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type CreateMeetingRequest,
  MeetingCategory,
  type MeetingCreated,
  MeetingStatus,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlots } from './slot-generation';

const MAX_PERIOD_DAYS = 14;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /api/meetings — JWT 필요. 모임 + 슬롯 + invite_token 을 한 트랜잭션으로 생성.
  async createMeeting(
    ownerId: number,
    body: CreateMeetingRequest,
  ): Promise<MeetingCreated> {
    const input = this.validate(body);

    const [startHour] = input.availableStartTime.split(':').map(Number);
    const [endHour] = input.availableEndTime.split(':').map(Number);
    const slots = generateSlots(
      input.startDate,
      input.endDate,
      startHour,
      endHour,
    );

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
    };
  }
}
