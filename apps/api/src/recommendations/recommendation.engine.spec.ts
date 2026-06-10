import { AvailabilityStatus } from '@whenwe/types';
import {
  computeRecommendations,
  type EngineInput,
  type EngineResponse,
} from './recommendation.engine';

// 헬퍼: 1시간 슬롯들을 baseHour 부터 연속 생성. id 는 1..count.
function hourlySlots(
  count: number,
  opts: { day?: string; baseHour?: number; startId?: number } = {},
) {
  const day = opts.day ?? '2026-06-01';
  const baseHour = opts.baseHour ?? 18;
  const startId = opts.startId ?? 1;
  return Array.from({ length: count }, (_, i) => {
    const startHour = baseHour + i;
    const endHour = startHour + 1;
    return {
      id: startId + i,
      slotStartAt: `${day}T${String(startHour).padStart(2, '0')}:00:00.000Z`,
      slotEndAt: `${day}T${String(endHour).padStart(2, '0')}:00:00.000Z`,
    };
  });
}

function resp(
  participantId: number,
  slotId: number,
  status: AvailabilityStatus,
): EngineResponse {
  return { participantId, slotId, availabilityStatus: status };
}

const A = AvailabilityStatus.AVAILABLE;
const M = AvailabilityStatus.MAYBE;
const U = AvailabilityStatus.UNAVAILABLE;

describe('computeRecommendations', () => {
  // (a) 전원 가능한 구간이 1위.
  it('(a) 전원 가능한 구간을 1위로 매긴다', () => {
    // 슬롯 1..3 (18-19,19-20,20-21), N=2 → 후보 (1,2),(2,3)
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(3),
      participants: [
        { id: 1, isRequired: false },
        { id: 2, isRequired: false },
      ],
      // 후보 (1,2): 둘 다 전원 가능. 후보 (2,3): p2 가 slot3 불가.
      responses: [
        resp(1, 1, A),
        resp(1, 2, A),
        resp(1, 3, A),
        resp(2, 1, A),
        resp(2, 2, A),
        resp(2, 3, U),
      ],
    };
    const out = computeRecommendations(input);
    expect(out[0].rank).toBe(1);
    expect(out[0].startAt).toBe('2026-06-01T18:00:00.000Z');
    expect(out[0].availableCount).toBe(2);
    expect(out[0].unavailableCount).toBe(0);
  });

  // (b) availableCount 동률 → score 로 결정.
  it('(b) availableCount 동률이면 score 가 높은 구간이 위', () => {
    // 두 후보 모두 available 0, 하지만 한쪽은 MAYBE(1) 다른쪽은 일부 UNAVAILABLE(0) → score 차이.
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(3),
      participants: [{ id: 1, isRequired: false }],
      responses: [
        // 후보(1,2): MAYBE,MAYBE → available 아님(maybe), score 1+1=2
        resp(1, 1, M),
        resp(1, 2, M),
        // 후보(2,3): MAYBE, UNAVAILABLE → maybe? min=U → unavailable, score 1+0=1
        resp(1, 3, U),
      ],
    };
    const out = computeRecommendations(input);
    // availableCount 둘 다 0 → score 로 갈림: 후보(1,2) score2 > 후보(2,3) score1
    expect(out[0].startAt).toBe('2026-06-01T18:00:00.000Z');
    expect(out[0].score).toBe(2);
    expect(out[1].score).toBe(1);
  });

  // (c) min 의미: 가능+애매 → 애매 / 가능+불가 → 불가.
  it('(c) 구간 상태는 min — 가능+애매=애매, 가능+불가=불가', () => {
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(2),
      participants: [
        { id: 1, isRequired: false }, // 가능+애매 → 애매
        { id: 2, isRequired: false }, // 가능+불가 → 불가
      ],
      responses: [resp(1, 1, A), resp(1, 2, M), resp(2, 1, A), resp(2, 2, U)],
    };
    const out = computeRecommendations(input);
    expect(out).toHaveLength(1);
    expect(out[0].availableCount).toBe(0);
    expect(out[0].maybeCount).toBe(1);
    expect(out[0].unavailableCount).toBe(1);
  });

  // (d) 일부 슬롯만 응답한 참여자 → 그 구간 '미응답'.
  it('(d) 구간 내 슬롯 하나라도 무응답이면 그 참여자는 미응답 처리', () => {
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(2),
      participants: [{ id: 1, isRequired: false }],
      // slot1 만 응답, slot2 무응답 → 미응답
      responses: [resp(1, 1, A)],
    };
    const out = computeRecommendations(input);
    expect(out[0].availableCount).toBe(0);
    expect(out[0].maybeCount).toBe(0);
    expect(out[0].unavailableCount).toBe(0);
    // 점수는 응답한 슬롯 점수만 합산(2), 분류는 미응답.
    expect(out[0].score).toBe(2);
  });

  // (e) 시간 불연속(하루 경계) 구간은 후보에서 제외.
  it('(e) 시간이 불연속인 구간은 후보에서 제외한다', () => {
    // day1 마지막 슬롯(22-23) 다음에 day2 첫 슬롯(18-19): 23 !== 18 → 불연속.
    const day1 = hourlySlots(2, {
      day: '2026-06-01',
      baseHour: 22,
      startId: 1,
    }); // 22-23, 23-24
    const day2 = hourlySlots(2, {
      day: '2026-06-02',
      baseHour: 18,
      startId: 3,
    }); // 18-19,19-20
    const slots = [...day1, ...day2];
    const input: EngineInput = {
      durationHours: 2,
      slots,
      participants: [{ id: 1, isRequired: false }],
      responses: slots.map((s) => resp(1, s.id, A)),
    };
    const out = computeRecommendations(input);
    // 가능한 연속 후보: (1,2) day1, (3,4) day2. (2,3) 은 23!==18 로 제외.
    expect(out).toHaveLength(2);
    const starts = out.map((o) => o.startAt).sort();
    expect(starts).toEqual([
      '2026-06-01T22:00:00.000Z',
      '2026-06-02T18:00:00.000Z',
    ]);
  });

  // (f) 모든 메트릭 동률 → slotStartAt, 그다음 slot id 로 결정론적.
  it('(f) 모든 메트릭이 동률이면 slotStartAt → slot id 로 결정론적', () => {
    // 연속 4슬롯, 응답 없음 → 모든 후보 메트릭 동일(전부 미응답).
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(4),
      participants: [{ id: 1, isRequired: false }],
      responses: [],
    };
    const out1 = computeRecommendations(input);
    const out2 = computeRecommendations(input);
    expect(out1).toEqual(out2); // 결정론적
    // startAt 오름차순으로 rank 부여(전부 동률이므로 빠른 날짜 우선)
    expect(out1.map((o) => o.startAt)).toEqual([
      '2026-06-01T18:00:00.000Z',
      '2026-06-01T19:00:00.000Z',
      '2026-06-01T20:00:00.000Z',
    ]);
  });

  // (g) 필수참여자가 불가인 구간이 가능인 구간보다 아래로.
  it('(g) 필수참여자 불가 구간은 가능 구간보다 낮은 순위(제외 아님)', () => {
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(3),
      participants: [
        { id: 1, isRequired: true }, // 필수
        { id: 2, isRequired: false },
      ],
      responses: [
        // 후보(1,2): 필수 p1 가능 → satisfied. p2 도 가능.
        resp(1, 1, A),
        resp(1, 2, A),
        resp(2, 1, A),
        resp(2, 2, A),
        // 후보(2,3): 필수 p1 가 slot3 불가 → not satisfied.
        resp(1, 3, U),
        resp(2, 3, A),
      ],
    };
    const out = computeRecommendations(input);
    expect(out).toHaveLength(2); // 제외되지 않고 둘 다 존재
    expect(out[0].requiredParticipantSatisfied).toBe(true);
    expect(out[0].startAt).toBe('2026-06-01T18:00:00.000Z');
    expect(out[1].requiredParticipantSatisfied).toBe(false);
  });

  // (i) ②availableCount 가 ③score 보다 우선 — availableCount 적지만 score 높은 후보가 진다.
  //     (비교자에서 availableCount 단계를 빼면 이 테스트가 실패해야 한다 = 핵심 단계 회귀 방어)
  it('(i) availableCount 가 score 보다 우선한다(낮은 availableCount·높은 score 는 짐)', () => {
    // 후보 A(slot1,2)=18-20, 후보 B(slot3,4)=21-23. 20!==21 로 둘 사이 후보 없음(독립 2개).
    const slotsA = hourlySlots(2, { baseHour: 18, startId: 1 }); // id1,2
    const slotsB = hourlySlots(2, { baseHour: 21, startId: 3 }); // id3,4
    const input: EngineInput = {
      durationHours: 2,
      slots: [...slotsA, ...slotsB],
      participants: [1, 2, 3, 4, 5, 6].map((id) => ({ id, isRequired: false })),
      responses: [
        // 후보 A: p1,p2 전원 가능 → availableCount 2, score 8
        resp(1, 1, A),
        resp(1, 2, A),
        resp(2, 1, A),
        resp(2, 2, A),
        // 후보 B: p3 가능(4) + p4,p5 애매(2+2) + p6 한 슬롯 애매(1) → availableCount 1, score 9
        resp(3, 3, A),
        resp(3, 4, A),
        resp(4, 3, M),
        resp(4, 4, M),
        resp(5, 3, M),
        resp(5, 4, M),
        resp(6, 3, M), // slot4 무응답 → B 에서 미응답, score +1
      ],
    };
    const out = computeRecommendations(input);
    expect(out).toHaveLength(2);
    // A 가 1위: availableCount(2 > 1) 가 score(8 < 9) 를 이긴다.
    expect(out[0].startAt).toBe('2026-06-01T18:00:00.000Z');
    expect(out[0].availableCount).toBe(2);
    expect(out[1].availableCount).toBe(1);
    expect(out[0].score).toBeLessThan(out[1].score); // 8 < 9 인데도 A 가 위
  });

  // (h) 후보 6개 이상이면 상위 5개만.
  it('(h) 후보가 6개 이상이어도 상위 5개만 반환', () => {
    // 연속 7슬롯, N=2 → 후보 6개. 5개만 반환.
    const input: EngineInput = {
      durationHours: 2,
      slots: hourlySlots(7),
      participants: [{ id: 1, isRequired: false }],
      responses: hourlySlots(7).map((s) => resp(1, s.id, A)),
    };
    const out = computeRecommendations(input);
    expect(out).toHaveLength(5);
    expect(out.map((o) => o.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
