import 'dotenv/config'; // .env 로드 (DATABASE_URL 등) — NestJS는 자동 로드하지 않음
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // nginx 리버스 프록시(단일 홉) 뒤에서 실제 클라이언트 IP를 얻기 위해 필요 —
  // 없으면 ThrottlerGuard의 IP 기반 레이트 리밋이 모든 요청을 같은 IP(프록시)로
  // 인식해 전체 사용자가 하나의 버킷을 공유하게 되어 무력화된다.
  app.set('trust proxy', 1);
  // 계약(openapi.yaml) 경로가 모두 /api/... 이므로 전역 prefix 부여
  app.setGlobalPrefix('api');
  // 허용 오리진: 운영은 CORS_ORIGIN(쉼표 구분, 예: Vercel 도메인), 없으면 로컬 개발 기본값.
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : 'http://localhost:3000';
  app.enableCors({ origin: corsOrigin, credentials: true });
  // Railway 등 PaaS 는 PORT 를 주입한다. 외부 노출을 위해 0.0.0.0 에 바인딩.
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
