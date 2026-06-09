import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: 마이그레이션/인트로스펙션용 연결 정보는 여기서 관리한다.
// (런타임 PrismaClient 는 별도로 드라이버 어댑터에 URL 을 전달한다)
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
