import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
        }
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
    // 비밀번호 재설정 메일 요청 레이트 리밋(IP 단위)에 사용.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // JwtAuthGuard 와 JwtModule(JwtService) 을 다른 모듈에서 재사용할 수 있게 export.
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
