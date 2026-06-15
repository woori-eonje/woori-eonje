// 검증용 시드. 멱등(이미 있으면 업서트).
// 실행(apps/api 디렉터리에서, ts-node 사용 — tsconfig 가 nodenext 라 override 필요):
//   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node","resolvePackageJsonExports":false}' \
//     node_modules/.bin/ts-node --transpile-only prisma/seed.ts
// Prisma 7: 런타임 PrismaClient 는 드라이버 어댑터 필수(@prisma/adapter-pg).
import 'dotenv/config';
import { PrismaClient, MeetingCategory, MeetingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';
import {
  expandDateRange,
  generateSlots,
} from '../src/meetings/slot-generation';

// 데모 모임장 로그인 평문 비밀번호(테스트용): demo1234
const DEMO_OWNER_PASSWORD = 'demo1234';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

async function main(): Promise<void> {
  // 로그인 → GET recommendations 테스트가 가능하도록 실제 bcrypt 해시로 저장.
  // 재시드 멱등을 위해 update 에서도 비밀번호를 갱신한다.
  const demoOwnerPasswordHash = hashSync(DEMO_OWNER_PASSWORD, 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.dev' },
    update: { password: demoOwnerPasswordHash, nickname: '데모모임장' },
    create: {
      email: 'owner@demo.dev',
      nickname: '데모모임장',
      password: demoOwnerPasswordHash,
    },
  });

  const meeting = await prisma.meeting.upsert({
    where: { inviteToken: 'demo-token' },
    update: {
      status: MeetingStatus.COLLECTING,
      category: MeetingCategory.FRIEND,
      title: '6월 전시 모임',
      description: '6월 초에 전시 보러 갈 사람들 일정 조율',
      startDate: new Date('2027-06-01'),
      endDate: new Date('2027-06-14'),
      durationHours: 2,
      availableStartTime: '18:00',
      availableEndTime: '23:00',
      responseDeadline: new Date('2027-06-12T23:59:00'),
      inviteTokenExpiresAt: null,
    },
    create: {
      ownerId: owner.id,
      inviteToken: 'demo-token',
      status: MeetingStatus.COLLECTING,
      category: MeetingCategory.FRIEND,
      title: '6월 전시 모임',
      description: '6월 초에 전시 보러 갈 사람들 일정 조율',
      startDate: new Date('2027-06-01'),
      endDate: new Date('2027-06-14'),
      durationHours: 2,
      availableStartTime: '18:00',
      availableEndTime: '23:00',
      responseDeadline: new Date('2027-06-12T23:59:00'),
      inviteTokenExpiresAt: null,
    },
  });

  // ── availability_slots 생성 (멱등: 기존 모임 슬롯 삭제 후 재생성) ──
  // create-meeting 과 동일한 KST(+09:00) 고정 슬롯 생성 헬퍼 공유 → TZ 환경 무관 일관.
  // 기간 startDate..endDate(양끝 포함) × 매일 18:00~23:00 = 하루 5슬롯 × 14일 = 70슬롯.
  await prisma.availabilitySlot.deleteMany({ where: { meetingId: meeting.id } });

  const [startHour] = meeting.availableStartTime.split(':').map(Number); // 18
  const [endHour] = meeting.availableEndTime.split(':').map(Number); //     23
  const dates = expandDateRange(
    meeting.startDate.toISOString().slice(0, 10),
    meeting.endDate.toISOString().slice(0, 10),
  );
  const slots = generateSlots(dates, startHour, endHour).map((s) => ({
    meetingId: meeting.id,
    ...s,
  }));

  await prisma.availabilitySlot.createMany({ data: slots });

  console.log('seed ok:', {
    ownerId: owner.id,
    meetingId: meeting.id,
    slotCount: slots.length,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
