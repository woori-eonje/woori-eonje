import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 전역 모듈: 어느 모듈에서든 재-import 없이 PrismaService 주입 가능
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
