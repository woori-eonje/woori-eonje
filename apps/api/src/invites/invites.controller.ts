import { Controller, Get, Param } from '@nestjs/common';
import type { InvitePublic } from '@whenwe/types';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // GET /api/invites/:inviteToken — 초대 토큰으로 모임 공개 정보 조회 (인증 불필요)
  @Get(':inviteToken')
  getInvite(@Param('inviteToken') inviteToken: string): Promise<InvitePublic> {
    return this.invitesService.getInvite(inviteToken);
  }
}
