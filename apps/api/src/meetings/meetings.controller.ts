import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ConfirmMeetingRequest,
  ConfirmResult,
  CreateMeetingRequest,
  MeetingCreated,
  MeetingDetail,
  MeetingSummary,
  Participant,
  SetParticipantRequiredRequest,
} from '@whenwe/types';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  // POST /api/meetings — 모임 생성 (JWT 필요, 로그인 사용자가 모임장)
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  createMeeting(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateMeetingRequest,
  ): Promise<MeetingCreated> {
    return this.meetingsService.createMeeting(req.user.id, body);
  }

  // GET /api/meetings — 내 모임 목록 (JWT 필요, owner 본인 것만)
  @Get()
  @UseGuards(JwtAuthGuard)
  listMyMeetings(@Req() req: AuthenticatedRequest): Promise<MeetingSummary[]> {
    return this.meetingsService.listMyMeetings(req.user.id);
  }

  // GET /api/meetings/:meetingId — 모임 상세 (JWT 필요 + 모임장 소유 검증)
  @Get(':meetingId')
  @UseGuards(JwtAuthGuard)
  getMeeting(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<MeetingDetail> {
    return this.meetingsService.getMeeting(meetingId, req.user.id);
  }

  // PATCH /api/meetings/:meetingId/participants/:participantId
  // 필수참석자 지정/해제 (JWT 필요 + 모임장 소유). 변경 후 추천 재계산.
  @Patch(':meetingId/participants/:participantId')
  @UseGuards(JwtAuthGuard)
  setParticipantRequired(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('participantId', ParseIntPipe) participantId: number,
    @Body() body: SetParticipantRequiredRequest,
  ): Promise<Participant> {
    if (!body || typeof body.isRequired !== 'boolean') {
      throw new BadRequestException('isRequired 는 boolean 이어야 합니다.');
    }
    return this.meetingsService.setParticipantRequired(
      meetingId,
      participantId,
      req.user.id,
      body.isRequired,
    );
  }

  // POST /api/meetings/:meetingId/confirm — 일정 확정 (JWT + 모임장 소유).
  // 추천 결과 1개를 골라 모임을 CONFIRMED 로 전환. 이미 확정된 모임은 409.
  @Post(':meetingId/confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  confirmMeeting(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() body: ConfirmMeetingRequest,
  ): Promise<ConfirmResult> {
    if (
      !body ||
      typeof body.recommendationId !== 'number' ||
      !Number.isInteger(body.recommendationId)
    ) {
      throw new BadRequestException('recommendationId 는 정수여야 합니다.');
    }
    return this.meetingsService.confirmMeeting(
      meetingId,
      req.user.id,
      body.recommendationId,
    );
  }
}
