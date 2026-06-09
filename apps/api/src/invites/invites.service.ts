import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, type InvitePublic } from '@whenwe/types';
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
    };
  }
}
