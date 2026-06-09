import 'dotenv/config'; // .env 로드 (DATABASE_URL 등) — NestJS는 자동 로드하지 않음
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // web(Next.js)이 3000을 쓰므로 api 기본 포트는 3001로 분리
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
