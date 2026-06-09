// 검증용 시드. 멱등(이미 있으면 업서트).
// 실행(apps/api 디렉터리에서, ts-node 사용 — tsconfig 가 nodenext 라 override 필요):
//   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node","resolvePackageJsonExports":false}' \
//     node_modules/.bin/ts-node --transpile-only prisma/seed.ts
// Prisma 7: 런타임 PrismaClient 는 드라이버 어댑터 필수(@prisma/adapter-pg).
import 'dotenv/config';
import { PrismaClient, MeetingCategory, MeetingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

async function main(): Promise<void> {
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.dev' },
    update: {},
    create: {
      email: 'owner@demo.dev',
      nickname: '데모모임장',
      // 데모용 더미 해시(실제 인증에 쓰지 않음)
      password: '$2b$10$demoDemoDemoDemoDemoDeMOCKHASHForSeedOnly1234567890ab',
    },
  });

  const meeting = await prisma.meeting.upsert({
    where: { inviteToken: 'demo-token' },
    update: {
      status: MeetingStatus.COLLECTING,
      category: MeetingCategory.FRIEND,
      title: '6월 전시 모임',
      description: '6월 초에 전시 보러 갈 사람들 일정 조율',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-14'),
      durationHours: 2,
      availableStartTime: '18:00',
      availableEndTime: '23:00',
      responseDeadline: new Date('2026-06-12T23:59:00'),
      inviteTokenExpiresAt: null,
    },
    create: {
      ownerId: owner.id,
      inviteToken: 'demo-token',
      status: MeetingStatus.COLLECTING,
      category: MeetingCategory.FRIEND,
      title: '6월 전시 모임',
      description: '6월 초에 전시 보러 갈 사람들 일정 조율',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-14'),
      durationHours: 2,
      availableStartTime: '18:00',
      availableEndTime: '23:00',
      responseDeadline: new Date('2026-06-12T23:59:00'),
      inviteTokenExpiresAt: null,
    },
  });

  console.log('seed ok:', { ownerId: owner.id, meetingId: meeting.id });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
