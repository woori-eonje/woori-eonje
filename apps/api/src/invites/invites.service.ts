import { randomUUID } from 'node:crypto';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type InvitePublic,
  type ParticipantRegistered,
  type RegisterParticipantRequest,
} from '@whenwe/types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain-exception';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 참여자 식별은 닉네임이 아니라 participantId + editToken.
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
}
