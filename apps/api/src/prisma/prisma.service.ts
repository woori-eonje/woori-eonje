import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7: Rust 엔진이 제거되어 런타임에 드라이버 어댑터가 필수다.
// pg 풀을 PrismaPg 어댑터로 감싸 PrismaClient 에 주입한다.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
    }
    super({ adapter: new PrismaPg(connectionString) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
