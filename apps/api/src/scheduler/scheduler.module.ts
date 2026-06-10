import { Module } from '@nestjs/common';
import { MeetingSchedulerService } from './meeting-scheduler.service';

@Module({
  providers: [MeetingSchedulerService],
})
export class SchedulerModule {}
