// 모임 기간 × 매일 가능시간 창을 1시간 슬롯으로 생성하는 순수 헬퍼.
// 타임존은 KST(+09:00) 고정으로 명시 구성한다 — 서버 로컬 TZ 에 의존하지 않는다.
// 예: 18:00 KST → 09:00Z 로 저장되어 시드/기존 슬롯과 일관.
//
// 참고: prisma/seed.ts 에 유사한 슬롯 생성 로직이 있다(시드는 로컬 TZ 해석을 쓰는
// 별도 구현). 시드는 ts-node 로 @whenwe/types 빌드 의존 없이 독립 실행되어야 해서
// 여기서 import 하지 않고 분리해 둔다.

export interface GeneratedSlot {
  slotStartAt: Date;
  slotEndAt: Date;
}

/**
 * 양끝 포함 날짜 범위를 KST 기준 YYYY-MM-DD 문자열 목록으로 펼친다.
 * @param startDate YYYY-MM-DD (양끝 포함 시작일)
 * @param endDate   YYYY-MM-DD (양끝 포함 종료일)
 */
export function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];

  // 날짜만 KST 자정(UTC 환경에서도 동일) 기준으로 순회한다.
  // KST 자정 Date 끼리 24h 씩 더하면 날짜 경계가 정확히 맞는다.
  const cursor = new Date(`${startDate}T00:00:00+09:00`);
  const last = new Date(`${endDate}T00:00:00+09:00`);

  while (cursor.getTime() <= last.getTime()) {
    // KST 기준 날짜 문자열(YYYY-MM-DD)로 다시 포맷한다.
    const kstMidnightUtc = new Date(cursor.getTime() + 9 * 60 * 60 * 1000);
    const yyyy = kstMidnightUtc.getUTCFullYear();
    const mm = String(kstMidnightUtc.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kstMidnightUtc.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);

    cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

/**
 * 날짜 목록 × 매일 가능시간 창을 1시간 슬롯으로 생성한다.
 * 전체 범위는 expandDateRange 로, 특정 날짜만이면 그 목록을 그대로 넘긴다.
 * @param dates     슬롯을 만들 날짜 목록(YYYY-MM-DD)
 * @param startHour 가능시간 창 시작 시(정수, HH:mm 의 HH)
 * @param endHour   가능시간 창 종료 시(정수, HH:mm 의 HH)
 */
export function generateSlots(
  dates: string[],
  startHour: number,
  endHour: number,
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];

  for (const dateStr of dates) {
    for (let hour = startHour; hour < endHour; hour++) {
      const hh = String(hour).padStart(2, '0');
      const slotStartAt = new Date(`${dateStr}T${hh}:00:00+09:00`);
      const slotEndAt = new Date(slotStartAt.getTime() + 60 * 60 * 1000);
      slots.push({ slotStartAt, slotEndAt });
    }
  }

  return slots;
}
