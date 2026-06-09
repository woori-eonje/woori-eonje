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

  // ── availability_slots 생성 (멱등: 기존 모임 슬롯 삭제 후 재생성) ──
  // 기간 startDate..endDate(양끝 포함), 매일 18:00~23:00 를 1시간 슬롯으로 쪼갬.
  // → 하루 5슬롯(18,19,20,21,22시 시작, 각 1h), 14일 = 70슬롯.
  // new Date('2026-06-01T18:00:00') 는 로컬(KST) 시각으로 해석된다.
  await prisma.availabilitySlot.deleteMany({ where: { meetingId: meeting.id } });

  const [startHour] = meeting.availableStartTime.split(':').map(Number); // 18
  const [endHour] = meeting.availableEndTime.split(':').map(Number); //     23

  const slots: { meetingId: number; slotStartAt: Date; slotEndAt: Date }[] = [];
  const day = new Date(meeting.startDate);
  const lastDay = new Date(meeting.endDate);
  while (day.getTime() <= lastDay.getTime()) {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    for (let hour = startHour; hour < endHour; hour++) {
      const hh = String(hour).padStart(2, '0');
      const slotStartAt = new Date(`${y}-${m}-${d}T${hh}:00:00`);
      const slotEndAt = new Date(slotStartAt.getTime() + 60 * 60 * 1000);
      slots.push({ meetingId: meeting.id, slotStartAt, slotEndAt });
    }
    day.setDate(day.getDate() + 1);
  }

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
