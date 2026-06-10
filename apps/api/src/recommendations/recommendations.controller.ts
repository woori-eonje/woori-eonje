import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { RecommendationsResponse } from '@whenwe/types';
import { RecommendationsService } from './recommendations.service';

// 인증(JWT)은 auth 슬라이스 전까지 미적용 — 지금은 열어둔다.
// TODO(auth): 모임장 JWT 가드 적용.
@Controller('meetings/:meetingId')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // GET /api/meetings/:meetingId/recommendations — 저장된 TOP5 반환(계산 안 함).
  @Get('recommendations')
  getRecommendations(
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<RecommendationsResponse> {
    return this.recommendationsService.getRecommendations(meetingId);
  }
}
