import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipEnvelope } from '../common/skip-envelope.decorator';
import type {
  AggregateResponse,
  ConfirmMeetingRequest,
  ConfirmResult,
  CreateMeetingRequest,
  MeetingCreated,
  MeetingDetail,
  MeetingSummary,
  Participant,
  ParticipantsResponse,
  SetParticipantRequiredRequest,
  UpdateMeetingRequest,
  VoteDetailsResponse,
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

  // GET /api/meetings — 내 모임 목록 (JWT 필요): 내가 만든 모임 + 회원으로 참여한 모임
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

  // GET /api/meetings/:meetingId/participants — 참여자 목록 (JWT + 모임장 소유)
  @Get(':meetingId/participants')
  @UseGuards(JwtAuthGuard)
  listParticipants(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<ParticipantsResponse> {
    return this.meetingsService.listParticipants(meetingId, req.user.id);
  }

  // PATCH /api/meetings/:meetingId — 모임 수정 (JWT + 모임장 소유). 응답자 0명일 때만.
  @Patch(':meetingId')
  @UseGuards(JwtAuthGuard)
  updateMeeting(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() body: UpdateMeetingRequest,
  ): Promise<MeetingDetail> {
    return this.meetingsService.updateMeeting(meetingId, req.user.id, body);
  }

  // DELETE /api/meetings/:meetingId — 모임 삭제 (JWT + 모임장 소유). 봉투 200 + Empty.
  @Delete(':meetingId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  deleteMeeting(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<Record<string, never>> {
    return this.meetingsService.deleteMeeting(meetingId, req.user.id);
  }

  // GET /api/meetings/:meetingId/aggregate — 응답 현황 히트맵 (JWT + 모임장 소유)
  @Get(':meetingId/aggregate')
  @UseGuards(JwtAuthGuard)
  getAggregate(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<AggregateResponse> {
    return this.meetingsService.getAggregate(meetingId, req.user.id);
  }

  // GET /api/meetings/:meetingId/vote-details — 참여자별 투표 상세 (JWT + 모임장 소유)
  // 공개 초대 API에는 제공하지 않는다.
  @Get(':meetingId/vote-details')
  @UseGuards(JwtAuthGuard)
  getVoteDetails(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<VoteDetailsResponse> {
    return this.meetingsService.getVoteDetails(meetingId, req.user.id);
  }

  // DELETE /api/meetings/:meetingId/participants/:participantId
  // 참여자 삭제 (JWT 필요 + 모임장 소유). COLLECTING/READY_TO_CONFIRM 에서만 허용.
  @Delete(':meetingId/participants/:participantId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  deleteParticipant(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('participantId', ParseIntPipe) participantId: number,
  ): Promise<Record<string, never>> {
    return this.meetingsService.deleteParticipant(
      meetingId,
      participantId,
      req.user.id,
    );
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

  // GET /api/meetings/:meetingId/calendar.ics — JWT + 모임장 소유.
  // 확정된 모임의 iCalendar 파일을 봉투 없이 raw text/calendar 로 반환. 미확정이면 409.
  @Get(':meetingId/calendar.ics')
  @UseGuards(JwtAuthGuard)
  @SkipEnvelope()
  async downloadCalendar(
    @Req() req: AuthenticatedRequest,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const ics = await this.meetingsService.downloadCalendar(
      meetingId,
      req.user.id,
    );
    // 성공 시에만 헤더 설정 — 에러(403/404/409)는 서비스에서 throw 되어 여기 도달 전이라
    // text/calendar 헤더가 붙지 않고 예외 필터가 application/json 봉투로 응답한다.
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="woori-eonje.ics"',
    );
    return ics;
  }
}
