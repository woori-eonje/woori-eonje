import { randomUUID } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ErrorCode,
  type InvitePublic,
  type ParticipantRegistered,
  type RegisterParticipantRequest,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';
import { resolveOptionalUserId } from '../auth/optional-bearer';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getInvite(inviteToken: string): Promise<InvitePublic> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { inviteToken },
    });

    if (!meeting) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_INVALID,
        HttpStatus.NOT_FOUND,
        '유효하지 않은 초대 링크입니다.',
      );
    }

    if (
      meeting.inviteTokenExpiresAt &&
      meeting.inviteTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_EXPIRED,
        HttpStatus.GONE,
        '만료된 초대 링크입니다.',
      );
    }

    return {
      meetingId: meeting.id,
      title: meeting.title,
      description: meeting.description,
      category: meeting.category,
      status: meeting.status,
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      durationHours: meeting.durationHours,
      availableStartTime: meeting.availableStartTime,
      availableEndTime: meeting.availableEndTime,
      responseDeadline: meeting.responseDeadline.toISOString(),
      confirmedStartAt: meeting.confirmedStartAt
        ? meeting.confirmedStartAt.toISOString()
        : null,
      confirmedEndAt: meeting.confirmedEndAt
        ? meeting.confirmedEndAt.toISOString()
        : null,
    };
  }

  async registerParticipant(
    inviteToken: string,
    body: RegisterParticipantRequest,
    authHeader?: string,
  ): Promise<ParticipantRegistered> {
    const guestName = body?.guestName?.trim();
    if (!guestName || guestName.length < 2 || guestName.length > 12) {
      throw new BadRequestException('닉네임은 2~12자여야 합니다.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { inviteToken },
    });

    if (!meeting) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_INVALID,
        HttpStatus.NOT_FOUND,
        '유효하지 않은 초대 링크입니다.',
      );
    }

    if (
      meeting.inviteTokenExpiresAt &&
      meeting.inviteTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new DomainException(
        ErrorCode.INVITE_TOKEN_EXPIRED,
        HttpStatus.GONE,
        '만료된 초대 링크입니다.',
      );
    }

    // 응답 수집 중(COLLECTING)일 때만 등록 가능. 그 외 상태는 마감 처리.
    if (meeting.status !== 'COLLECTING') {
      throw new DomainException(
        ErrorCode.RESPONSE_DEADLINE_PASSED,
        HttpStatus.GONE,
        '응답을 받을 수 있는 기간이 아닙니다.',
      );
    }

    // Bearer 가 있으면 로그인 사용자를 회원(MEMBER)으로 연동. 없으면 기존 비회원(GUEST).
    const userId = await resolveOptionalUserId(
      this.jwtService,
      this.prisma,
      authHeader,
    );

    if (userId !== null) {
      // 회원은 한 모임 1회 — 이미 참여했으면 기존 참여자를 그대로 반환(멱등).
      // 그러면 FE 가 응답 화면으로 보내 기존 응답을 보거나 변경할 수 있다.
      const existing = await this.prisma.participant.findUnique({
        where: { userId_meetingId: { userId, meetingId: meeting.id } },
      });
      if (existing) {
        return {
          participantId: existing.id,
          guestName: existing.guestName,
          participantEditToken: existing.editToken,
        };
      }

      try {
        const member = await this.prisma.participant.create({
          data: {
            meetingId: meeting.id,
            userId,
            guestName,
            participantType: 'MEMBER',
            // 회원은 JWT 로 응답을 식별하므로 edit_token 을 발급하지 않는다.
            editToken: null,
          },
        });
        return {
          participantId: member.id,
          guestName: member.guestName,
          participantEditToken: null,
        };
      } catch (e) {
        // 경합: findUnique 와 create 사이에 같은 회원이 먼저 등록되면 unique(P2002)
        // 위반 → 멱등 복구로 기존 참여자를 다시 조회해 반환(500 노출 방지).
        if (this.isUniqueViolation(e)) {
          const created = await this.prisma.participant.findUnique({
            where: { userId_meetingId: { userId, meetingId: meeting.id } },
          });
          if (created) {
            return {
              participantId: created.id,
              guestName: created.guestName,
              participantEditToken: created.editToken,
            };
          }
        }
        throw e;
      }
    }

    // 비회원 참여자 식별은 닉네임이 아니라 participantId + editToken.
    // 동일 닉네임을 허용하며, 매 등록은 새 Participant 를 생성한다.
    const participant = await this.prisma.participant.create({
      data: {
        meetingId: meeting.id,
        userId: null,
        guestName,
        participantType: 'GUEST',
        editToken: randomUUID(),
      },
    });

    return {
      participantId: participant.id,
      guestName: participant.guestName,
      participantEditToken: participant.editToken!,
    };
  }

  // Prisma unique 제약 위반(P2002) 판별 — auth.service 의 동명 헬퍼와 같은 duck-typing.
  private isUniqueViolation(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: unknown }).code === 'P2002'
    );
  }
}
