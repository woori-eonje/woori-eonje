import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // AuthModule → JwtService(회원 Bearer 인증) 주입용.
  imports: [RecommendationsModule, AuthModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
