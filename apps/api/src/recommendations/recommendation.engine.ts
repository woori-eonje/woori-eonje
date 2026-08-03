import { AVAILABILITY_SCORE, AvailabilityStatus } from '@whenwe/types';

// 추천 계산 엔진 — 순수 함수. DB·NestJS 의존 없음(단위 테스트 대상).
// 스펙: docs/domain.md(추천 8단계 정렬) + 작업 지시서.

export interface EngineSlot {
  id: number;
  /** ISO 8601 date-time */
  slotStartAt: string;
  /** ISO 8601 date-time */
  slotEndAt: string;
}

export interface EngineParticipant {
  id: number;
  isRequired: boolean;
}

export interface EngineResponse {
  participantId: number;
  slotId: number;
  availabilityStatus: AvailabilityStatus;
}

export interface EngineInput {
  /** 예상 소요 시간 N — 연속 N개 슬롯을 한 후보 구간으로 묶는다 */
  durationHours: number;
  /** slotStartAt 오름차순 정렬된 슬롯들 */
  slots: EngineSlot[];
  participants: EngineParticipant[];
  responses: EngineResponse[];
}

export interface RankedCandidate {
  rank: number;
  /** 후보 구간 첫 슬롯 시작 (ISO) */
  startAt: string;
  /** 후보 구간 마지막 슬롯 끝 (ISO) */
  endAt: string;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  requiredAvailableCount: number;
  requiredMaybeCount: number;
  requiredUnavailableCount: number;
  requiredParticipantSatisfied: boolean;
  score: number;
}

// 한 참여자의 한 후보 구간에서의 분류. vote-details(참여자별 투표 상세)가 같은 규칙을
// 재사용하도록 export — 프론트가 이 분류를 별도 재구현하면 추천 인원수와 어긋날 수 있다.
export type IntervalClass =
  | 'available'
  | 'maybe'
  | 'unavailable'
  | 'no_response';

// 정렬용 내부 메트릭(저장되지 않는 noResponseCount, 첫 슬롯 id 포함).
interface CandidateMetric {
  startAt: string;
  endAt: string;
  firstSlotId: number;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  requiredAvailableCount: number;
  requiredMaybeCount: number;
  requiredUnavailableCount: number;
  requiredParticipantSatisfied: boolean;
  noResponseCount: number;
  score: number;
}

// (participantId, slotId) -> status 빠른 조회 맵 생성. classifyParticipant 와 같은
// 키 포맷(`${participantId}:${slotId}`)을 다른 모듈(vote-details 등)에서도 그대로
// 재사용할 수 있도록 export — 키 포맷이 바뀌면 한 곳만 고치면 되게 한다.
export function buildStatusMap(
  responses: EngineResponse[],
): Map<string, AvailabilityStatus> {
  const statusByKey = new Map<string, AvailabilityStatus>();
  for (const r of responses) {
    statusByKey.set(`${r.participantId}:${r.slotId}`, r.availabilityStatus);
  }
  return statusByKey;
}

export function computeRecommendations(input: EngineInput): RankedCandidate[] {
  const { durationHours: n, slots, participants, responses } = input;

  if (n < 1 || slots.length < n) {
    return [];
  }

  const statusByKey = buildStatusMap(responses);

  const metrics: CandidateMetric[] = [];

  // ① 후보 구간 생성: 연속 N개 슬롯, 단 시간 연속(slot[i].end === slot[i+1].start)일 때만.
  for (let i = 0; i + n <= slots.length; i++) {
    const window = slots.slice(i, i + n);
    if (!isContiguous(window)) {
      continue;
    }
    metrics.push(buildMetric(window, participants, statusByKey));
  }

  // ④ 8단계 안정 정렬 후 상위 5개에 rank 부여.
  metrics.sort(compareCandidates);

  return metrics.slice(0, 5).map((m, idx) => ({
    rank: idx + 1,
    startAt: m.startAt,
    endAt: m.endAt,
    availableCount: m.availableCount,
    maybeCount: m.maybeCount,
    unavailableCount: m.unavailableCount,
    requiredAvailableCount: m.requiredAvailableCount,
    requiredMaybeCount: m.requiredMaybeCount,
    requiredUnavailableCount: m.requiredUnavailableCount,
    requiredParticipantSatisfied: m.requiredParticipantSatisfied,
    score: m.score,
  }));
}

// 연속성 규칙(slot[i].end === slot[i+1].start)은 slot-generation.ts 의 buildWindows
// (GET slots 의 표시용 블록)와 공유된다 — 한쪽을 바꾸면 다른 쪽도 같이 바꿔야 동일한 블록 집합이 유지된다.
function isContiguous(window: EngineSlot[]): boolean {
  for (let i = 0; i + 1 < window.length; i++) {
    if (window[i].slotEndAt !== window[i + 1].slotStartAt) {
      return false;
    }
  }
  return true;
}

function buildMetric(
  window: EngineSlot[],
  participants: EngineParticipant[],
  statusByKey: Map<string, AvailabilityStatus>,
): CandidateMetric {
  let availableCount = 0;
  let maybeCount = 0;
  let unavailableCount = 0;
  let requiredAvailableCount = 0;
  let requiredMaybeCount = 0;
  let requiredUnavailableCount = 0;
  let noResponseCount = 0;
  let score = 0;
  let requiredParticipantSatisfied = true;

  for (const p of participants) {
    const cls = classifyParticipant(p.id, window, statusByKey);

    // ③ 구간 점수: (참여자×슬롯) 점수 합. 미응답은 0.
    for (const slot of window) {
      const status = statusByKey.get(`${p.id}:${slot.id}`);
      score += status ? AVAILABILITY_SCORE[status] : 0;
    }

    switch (cls) {
      case 'available':
        availableCount++;
        if (p.isRequired) requiredAvailableCount++;
        break;
      case 'maybe':
        maybeCount++;
        if (p.isRequired) requiredMaybeCount++;
        break;
      case 'unavailable':
        unavailableCount++;
        if (p.isRequired) requiredUnavailableCount++;
        break;
      case 'no_response':
        noResponseCount++;
        break;
    }

    // 필수참여자 전원이 '가능'이어야 satisfied. 하나라도 아니면 false.
    if (p.isRequired && cls !== 'available') {
      requiredParticipantSatisfied = false;
    }
  }

  return {
    startAt: window[0].slotStartAt,
    endAt: window[window.length - 1].slotEndAt,
    firstSlotId: window[0].id,
    availableCount,
    maybeCount,
    unavailableCount,
    requiredAvailableCount,
    requiredMaybeCount,
    requiredUnavailableCount,
    requiredParticipantSatisfied,
    noResponseCount,
    score,
  };
}

// ② 참여자별 구간 상태: 미응답 슬롯 하나라도 있으면 미응답, 아니면 min(가장 나쁜 것).
export function classifyParticipant(
  participantId: number,
  window: EngineSlot[],
  statusByKey: Map<string, AvailabilityStatus>,
): IntervalClass {
  // window가 비어있으면 아래 루프가 한 번도 안 돌아 worst=AVAILABLE 그대로 반환된다 —
  // "전원 가능"이라는 잘못된 결과를 침묵 반환하지 않도록 호출자 버그로 간주해 명시적으로 막는다.
  if (window.length === 0) {
    throw new Error('classifyParticipant: window must not be empty');
  }
  let worst = AVAILABILITY_SCORE[AvailabilityStatus.AVAILABLE]; // 2 부터 시작해 최솟값 추적
  for (const slot of window) {
    const status = statusByKey.get(`${participantId}:${slot.id}`);
    if (!status) {
      return 'no_response';
    }
    const s = AVAILABILITY_SCORE[status];
    if (s < worst) {
      worst = s;
    }
  }
  if (worst === 2) return 'available';
  if (worst === 0) return 'unavailable';
  return 'maybe';
}

// ④ 8단계 비교자 (Array.prototype.sort 는 안정 정렬이지만, 8단계가 모든 동률을
// 결정론적으로 깨므로 안정성에 의존하지 않는다).
function compareCandidates(a: CandidateMetric, b: CandidateMetric): number {
  // ① requiredParticipantSatisfied true 우선
  if (a.requiredParticipantSatisfied !== b.requiredParticipantSatisfied) {
    return a.requiredParticipantSatisfied ? -1 : 1;
  }
  // ② availableCount 큰 순
  if (a.availableCount !== b.availableCount) {
    return b.availableCount - a.availableCount;
  }
  // ③ score 큰 순
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  // ④ unavailableCount 작은 순
  if (a.unavailableCount !== b.unavailableCount) {
    return a.unavailableCount - b.unavailableCount;
  }
  // ⑤ maybeCount 작은 순
  if (a.maybeCount !== b.maybeCount) {
    return a.maybeCount - b.maybeCount;
  }
  // ⑥ noResponseCount 작은 순
  if (a.noResponseCount !== b.noResponseCount) {
    return a.noResponseCount - b.noResponseCount;
  }
  // ⑦ slotStartAt 이른 순
  if (a.startAt !== b.startAt) {
    return a.startAt < b.startAt ? -1 : 1;
  }
  // ⑧ 첫 슬롯 id 오름차순 — 최종 결정론적 tie-break
  return a.firstSlotId - b.firstSlotId;
}
