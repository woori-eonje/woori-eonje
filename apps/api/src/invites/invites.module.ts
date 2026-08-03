import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [
    // AuthModule → JwtService(선택적 Bearer 검증) 주입용.
    AuthModule,
    // participantSession 의 IP 단위 레이트 리밋에 사용(auth.module.ts 와 동일 패턴,
    // AuthModule 이 export 하지 않으므로 이 모듈에서 독립적으로 등록).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
