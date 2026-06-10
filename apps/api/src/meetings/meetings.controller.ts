import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { CreateMeetingRequest, MeetingCreated } from '@whenwe/types';
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
}
