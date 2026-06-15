import { expandDateRange, generateSlots } from './slot-generation';

describe('expandDateRange', () => {
  it('양끝을 포함해 날짜를 펼친다', () => {
    expect(expandDateRange('2026-06-01', '2026-06-03')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('시작=종료면 그 하루만 반환한다', () => {
    expect(expandDateRange('2026-06-10', '2026-06-10')).toEqual(['2026-06-10']);
  });

  it('월 경계를 정확히 넘는다(KST 자정 기준)', () => {
    expect(expandDateRange('2026-06-29', '2026-07-01')).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
    ]);
  });
});

describe('generateSlots', () => {
  it('날짜 × 가능시간 창을 1시간 슬롯으로 만든다(KST → UTC 저장)', () => {
    const slots = generateSlots(['2026-06-01'], 18, 23);
    // 18,19,20,21,22시 시작 = 5슬롯.
    expect(slots).toHaveLength(5);
    // 18:00 KST = 09:00Z, 끝은 +1h.
    expect(slots[0].slotStartAt.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    expect(slots[0].slotEndAt.toISOString()).toBe('2026-06-01T10:00:00.000Z');
    expect(slots[4].slotStartAt.toISOString()).toBe('2026-06-01T13:00:00.000Z');
    expect(slots[4].slotEndAt.toISOString()).toBe('2026-06-01T14:00:00.000Z');
  });

  it('여러 날짜면 날짜 수 × 창 시간만큼 생성한다', () => {
    const slots = generateSlots(['2026-06-01', '2026-06-02'], 18, 20);
    expect(slots).toHaveLength(4); // 2일 × 2슬롯
  });

  it('빈 날짜 목록이면 슬롯이 없다', () => {
    expect(generateSlots([], 18, 23)).toHaveLength(0);
  });

  it('비연속 날짜는 날짜 경계에서 연속이 끊긴다(가짜 후보 방지의 근거)', () => {
    // 6/1 과 6/3 만 선택 — 6/1 마지막 슬롯 끝(23:00 KST)과 6/3 첫 슬롯 시작(18:00 KST)이
    // 불일치해야 추천 엔진의 isContiguous 가 두 날짜를 잇는 가짜 구간을 만들지 않는다.
    const slots = generateSlots(['2026-06-01', '2026-06-03'], 18, 23);
    const day1Last = slots[4]; // 6/1 22:00~23:00 KST
    const day2First = slots[5]; // 6/3 18:00~19:00 KST
    expect(day1Last.slotEndAt.toISOString()).toBe('2026-06-01T14:00:00.000Z');
    expect(day2First.slotStartAt.toISOString()).toBe(
      '2026-06-03T09:00:00.000Z',
    );
    expect(day1Last.slotEndAt.getTime()).not.toBe(
      day2First.slotStartAt.getTime(),
    );
  });
});
