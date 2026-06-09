// 가능시간 슬롯/제출 데이터 계층 — 슬롯을 화면용으로 묶고, 상태를 계약 ↔ 화면으로 변환(2층 reconcile).
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import type {
  Slot,
  SlotsResponse,
  AvailabilityItem,
  AvailabilityStatus,
  MyAvailability,
  SubmitAvailabilityRequest,
  SubmitAvailabilityResponse,
} from "@whenwe/types";
import type { SlotState } from "@/types/meeting";
import { apiGet, apiPost } from "./api";

const TZ = "Asia/Seoul";

// 화면(SlotState 소문자) ↔ 계약(AvailabilityStatus 대문자)
const TO_API: Record<SlotState, AvailabilityStatus> = {
  available: "AVAILABLE",
  maybe: "MAYBE",
  unavail: "UNAVAILABLE",
};
const FROM_API: Record<AvailabilityStatus, SlotState> = {
  AVAILABLE: "available",
  MAYBE: "maybe",
  UNAVAILABLE: "unavail",
};

export interface DaySlot {
  slotId: number;
  /** "오후 6:00" */
  timeLabel: string;
}
export interface DayGroup {
  /** "2026-06-01" (KST 기준 날짜) — 탭 식별/활성 키 */
  dateKey: string;
  /** "6.1" */
  label: string;
  /** "목" */
  weekday: string;
  /** 주말 여부 (빠른 선택용) */
  weekend: boolean;
  slots: DaySlot[];
}

/** 슬롯(ISO)을 KST 날짜별로 묶어 화면 구조로. */
export function groupSlotsByDay(slots: Slot[]): DayGroup[] {
  const ordered = [...slots].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const map = new Map<string, DayGroup>();
  for (const s of ordered) {
    const dateKey = formatInTimeZone(s.startAt, TZ, "yyyy-MM-dd");
    let g = map.get(dateKey);
    if (!g) {
      const dow = formatInTimeZone(s.startAt, TZ, "i"); // 1(월)~7(일)
      g = {
        dateKey,
        label: formatInTimeZone(s.startAt, TZ, "M.d"),
        weekday: formatInTimeZone(s.startAt, TZ, "EEE", { locale: ko }),
        weekend: dow === "6" || dow === "7",
        slots: [],
      };
      map.set(dateKey, g);
    }
    g.slots.push({
      slotId: s.slotId,
      timeLabel: formatInTimeZone(s.startAt, TZ, "a h:mm", { locale: ko }),
    });
  }
  return [...map.values()];
}

export async function fetchSlots(meetingId: number): Promise<DayGroup[]> {
  const res = await apiGet<SlotsResponse>(`/api/meetings/${meetingId}/slots`);
  return groupSlotsByDay(res.slots);
}

/** 내 기존 응답을 화면 picks(Record<slotId, SlotState>)로. */
export async function fetchMyPicks(
  meetingId: number,
  editToken: string,
): Promise<Record<number, SlotState>> {
  const me = await apiGet<MyAvailability>(
    `/api/meetings/${meetingId}/availability/me`,
    { "X-Participant-Edit-Token": editToken },
  );
  const picks: Record<number, SlotState> = {};
  for (const it of me.items) picks[it.slotId] = FROM_API[it.status];
  return picks;
}

export function submitAvailability(
  meetingId: number,
  editToken: string,
  participantId: number,
  picks: Record<number, SlotState>,
): Promise<SubmitAvailabilityResponse> {
  const items: AvailabilityItem[] = Object.entries(picks).map(
    ([slotId, state]) => ({ slotId: Number(slotId), status: TO_API[state] }),
  );
  const body: SubmitAvailabilityRequest = { participantId, items };
  return apiPost<SubmitAvailabilityResponse>(
    `/api/meetings/${meetingId}/availability`,
    body,
    { "X-Participant-Edit-Token": editToken },
  );
}
