import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { InvitesModule } from './invites/invites.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { DomainExceptionFilter } from './common/domain-exception.filter';

@Module({
  imports: [PrismaModule, InvitesModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
