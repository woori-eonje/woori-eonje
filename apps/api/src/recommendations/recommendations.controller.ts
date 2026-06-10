import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RecommendationsResponse } from '@whenwe/types';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';

// 추천 결과는 모임장 전용: JWT 인증(JwtAuthGuard) + 서비스에서 owner 검증.
@Controller('meetings/:meetingId')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // GET /api/meetings/:meetingId/recommendations — 저장된 TOP5 반환(계산 안 함).
  @Get('recommendations')
  getRecommendations(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<RecommendationsResponse> {
    return this.recommendationsService.getRecommendations(
      meetingId,
      req.user.id,
    );
  }
}
