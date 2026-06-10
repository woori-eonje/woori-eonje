import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MeetingsModule } from './meetings/meetings.module';
import { InvitesModule } from './invites/invites.module';
import { AvailabilityModule } from './availability/availability.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { DomainExceptionFilter } from './common/domain-exception.filter';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MeetingsModule,
    InvitesModule,
    AvailabilityModule,
    RecommendationsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
