import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import type {
  MyAvailability,
  SlotsResponse,
  SubmitAvailabilityRequest,
  SubmitAvailabilityResponse,
} from '@whenwe/types';
import { AvailabilityService } from './availability.service';

@Controller('meetings/:meetingId')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // GET /api/meetings/:meetingId/slots — 시간 슬롯 목록 (인증 불필요)
  @Get('slots')
  listSlots(
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<SlotsResponse> {
    return this.availabilityService.listSlots(meetingId);
  }

  // POST /api/meetings/:meetingId/availability — 가능 시간 제출/수정.
  // 회원은 Authorization Bearer(JWT), 비회원은 X-Participant-Edit-Token.
  @Post('availability')
  @HttpCode(200)
  submitAvailability(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Headers('x-participant-edit-token') editToken: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: SubmitAvailabilityRequest,
  ): Promise<SubmitAvailabilityResponse> {
    return this.availabilityService.submitAvailability(
      meetingId,
      editToken,
      authHeader,
      body,
    );
  }

  // GET /api/meetings/:meetingId/availability/me — 내 응답 조회.
  // 회원은 Authorization Bearer(JWT), 비회원은 X-Participant-Edit-Token.
  @Get('availability/me')
  getMyAvailability(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Headers('x-participant-edit-token') editToken: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
  ): Promise<MyAvailability> {
    return this.availabilityService.getMyAvailability(
      meetingId,
      editToken,
      authHeader,
    );
  }
}
