// 우리 언제? — FE·BE 공유 타입 (API 계약의 단일 출처)
// 도메인 규칙 출처: plan/whenwe_plan_v0.3.pdf

// ── 모임 상태머신 ──────────────────────────────────────────────
// DRAFT → COLLECTING → READY_TO_CONFIRM → CONFIRMED → CLOSED
export const MeetingStatus = {
  DRAFT: 'DRAFT',
  COLLECTING: 'COLLECTING',
  READY_TO_CONFIRM: 'READY_TO_CONFIRM',
  CONFIRMED: 'CONFIRMED',
  CLOSED: 'CLOSED',
} as const;
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];

// ── 참여자 가능 시간 상태 / 점수 ───────────────────────────────
export const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  MAYBE: 'MAYBE',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;
export type AvailabilityStatus =
  (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];

/** 추천 계산 점수: 가능=2, 애매=1, 불가=0 */
export const AVAILABILITY_SCORE: Record<AvailabilityStatus, number> = {
  AVAILABLE: 2,
  MAYBE: 1,
  UNAVAILABLE: 0,
};

// ── 모임 성격 / 참여자 유형 ────────────────────────────────────
export const MeetingCategory = {
  FRIEND: 'FRIEND',
  STUDY: 'STUDY',
  BUSINESS: 'BUSINESS',
} as const;
export type MeetingCategory =
  (typeof MeetingCategory)[keyof typeof MeetingCategory];

export const ParticipantType = {
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const;
export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];

// ── 에러 코드 (기획서 24장) ────────────────────────────────────
export const ErrorCode = {
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',
  INVITE_TOKEN_INVALID: 'INVITE_TOKEN_INVALID',
  INVITE_TOKEN_EXPIRED: 'INVITE_TOKEN_EXPIRED',
  RESPONSE_DEADLINE_PASSED: 'RESPONSE_DEADLINE_PASSED',
  MEETING_ALREADY_CONFIRMED: 'MEETING_ALREADY_CONFIRMED',
  PARTICIPANT_EDIT_TOKEN_INVALID: 'PARTICIPANT_EDIT_TOKEN_INVALID',
  FORBIDDEN_MEETING_OWNER_ONLY: 'FORBIDDEN_MEETING_OWNER_ONLY',
  RECOMMENDATION_NOT_READY: 'RECOMMENDATION_NOT_READY',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── 공통 API 응답 포맷 (기획서 24장) ───────────────────────────
export interface ApiError {
  code: ErrorCode;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ── API DTO: 초대 공개 정보 (GET /api/invites/{inviteToken}) ────
// openapi.yaml 의 InvitePublic 스키마와 일치. FE·BE 공유.
export interface InvitePublic {
  meetingId: number;
  title: string;
  description: string | null;
  category: MeetingCategory;
  status: MeetingStatus;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  durationHours: number;
  /** HH:mm */
  availableStartTime: string;
  /** HH:mm */
  availableEndTime: string;
  /** ISO 8601 date-time */
  responseDeadline: string;
}

// ── API DTO: 비회원 참여자 등록 (POST /api/invites/{inviteToken}/participants)
export interface RegisterParticipantRequest {
  guestName: string;
}

export interface ParticipantRegistered {
  participantId: number;
  guestName: string;
  /** 비회원 응답 수정용 토큰 — 클라이언트(localStorage)에 저장 */
  participantEditToken: string;
}

// ── API DTO: 슬롯 / 가능시간 제출 (GET slots, POST availability) ────
export interface Slot {
  slotId: number;
  /** ISO 8601 date-time */
  startAt: string;
  /** ISO 8601 date-time */
  endAt: string;
}

export interface SlotsResponse {
  meetingId: number;
  slots: Slot[];
}

export interface AvailabilityItem {
  slotId: number;
  status: AvailabilityStatus;
}

export interface SubmitAvailabilityRequest {
  participantId: number;
  items: AvailabilityItem[];
}

export interface SubmitAvailabilityResponse {
  saved: boolean;
  updatedRecommendation: boolean;
}

export interface MyAvailability {
  participantId: number;
  guestName: string;
  items: AvailabilityItem[];
}
