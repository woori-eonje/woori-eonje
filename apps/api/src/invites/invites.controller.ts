import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type {
  InvitePublic,
  ParticipantRegistered,
  RegisterParticipantRequest,
} from '@whenwe/types';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // GET /api/invites/:inviteToken — 초대 토큰으로 모임 공개 정보 조회 (인증 불필요)
  @Get(':inviteToken')
  getInvite(@Param('inviteToken') inviteToken: string): Promise<InvitePublic> {
    return this.invitesService.getInvite(inviteToken);
  }

  // POST /api/invites/:inviteToken/participants — 비회원 참여자 등록 + edit token 발급 (인증 불필요)
  @Post(':inviteToken/participants')
  @HttpCode(201)
  registerParticipant(
    @Param('inviteToken') inviteToken: string,
    @Body() body: RegisterParticipantRequest,
  ): Promise<ParticipantRegistered> {
    return this.invitesService.registerParticipant(inviteToken, body);
  }
}
