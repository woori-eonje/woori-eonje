import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {
  InvitePublic,
  ParticipantRegistered,
  ParticipantSessionRequest,
  ParticipantSessionResult,
  RegisterParticipantRequest,
} from '@whenwe/types';
import { InvitesService } from './invites.service';
import { ParticipantSessionThrottlerGuard } from './participant-session-throttler.guard';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // GET /api/invites/:inviteToken — 초대 토큰으로 모임 공개 정보 조회 (인증 불필요)
  @Get(':inviteToken')
  getInvite(@Param('inviteToken') inviteToken: string): Promise<InvitePublic> {
    return this.invitesService.getInvite(inviteToken);
  }

  // POST /api/invites/:inviteToken/participants — 참여자 등록.
  // Bearer 있으면 회원(MEMBER) 연동, 없으면 비회원(GUEST) + edit token 발급 + 참여 PIN 등록.
  @Post(':inviteToken/participants')
  @HttpCode(201)
  registerParticipant(
    @Param('inviteToken') inviteToken: string,
    @Body() body: RegisterParticipantRequest,
    @Headers('authorization') authHeader: string | undefined,
  ): Promise<ParticipantRegistered> {
    return this.invitesService.registerParticipant(
      inviteToken,
      body,
      authHeader,
    );
  }

  // POST /api/invites/:inviteToken/participants/session — 비회원 닉네임+PIN 재접속.
  // IP 단위 5회/분 제한(닉네임+초대 단위 잠금은 서비스 레이어에서 별도 처리).
  @Post(':inviteToken/participants/session')
  @HttpCode(200)
  @UseGuards(ParticipantSessionThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  participantSession(
    @Param('inviteToken') inviteToken: string,
    @Body() body: ParticipantSessionRequest,
  ): Promise<ParticipantSessionResult> {
    return this.invitesService.participantSession(inviteToken, body);
  }
}
