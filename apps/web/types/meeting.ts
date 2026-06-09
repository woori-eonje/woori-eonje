/* 우리 언제? — 공유 도메인 타입
   API 연동 시 이 파일의 타입을 기준으로 요청/응답 타입을 확장한다. */

export type MeetingStatus =
  | "COLLECTING"
  | "READY_TO_CONFIRM"
  | "CONFIRMED"
  | "CLOSED"
  | "EXPIRED";

export type MeetingCategory = "friend" | "study" | "business";

export type AvailStatus = "available" | "maybe" | "unavail" | "pending";

export type SlotState = "available" | "maybe" | "unavail";

export type Picks = Record<string, Record<string, SlotState>>;

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  category: MeetingCategory;
  status: MeetingStatus;
  dateRange: string;
  startDate?: string;
  endDate?: string;
  deadline: string;
  responseDeadline?: string;
  durationHours?: number;
  responseCount: number;
  totalCount: number;
  inviteToken?: string;
}

export interface Participant {
  id?: string;
  name: string;
  status: AvailStatus;
  required?: boolean;
  editToken?: string;
}

export interface TimeSlotData {
  id: string;
  date: string;
  time: string;
  startAt?: string;
  endAt?: string;
}

export interface Recommendation {
  rank: number;
  when: string;
  dateLabel: string;
  time: string;
  startAt?: string;
  endAt?: string;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  requiredSatisfied: boolean;
  note?: string;
  participants?: Participant[];
  score?: number;
}
