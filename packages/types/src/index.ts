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
  // ── 인증(Auth) ──
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
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

// ── API DTO: 인증 (POST /api/auth/signup|login, GET /api/auth/me) ──
// openapi.yaml 의 SignupRequest/LoginRequest/AuthUser/LoginResult 와 일치. FE·BE 공유.
export interface SignupRequest {
  /** format: email */
  email: string;
  /** 8~72자 */
  password: string;
  /** 1~30자 */
  nickname: string;
}

export interface LoginRequest {
  /** format: email */
  email: string;
  password: string;
}

/** 인증 응답에 노출되는 사용자 정보 — password 는 절대 포함하지 않는다. */
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

export interface LoginResult {
  /** JWT (Authorization: Bearer <accessToken>) */
  accessToken: string;
  user: AuthUser;
}

// ── API DTO: 모임 생성 (POST /api/meetings) ────────────────────
// openapi.yaml 의 CreateMeetingRequest/MeetingCreated 스키마와 일치. FE·BE 공유.
export interface CreateMeetingRequest {
  /** 1~100자 */
  title: string;
  /** ~500자, 없으면 null */
  description?: string | null;
  category: MeetingCategory;
  /** YYYY-MM-DD (기간은 최대 14일) */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  /** HH:mm */
  availableStartTime: string;
  /** HH:mm */
  availableEndTime: string;
  /** 정수 1~12 */
  durationHours: number;
  /** ISO 8601 date-time */
  responseDeadline: string;
}

export interface MeetingCreated {
  meetingId: number;
  title: string;
  status: MeetingStatus;
  /** format: uri — 초대 링크 */
  inviteUrl: string;
}

// ── API DTO: 모임 조회 (GET /api/meetings, GET /api/meetings/{meetingId}) ──
// openapi.yaml 의 MeetingSummary/MeetingDetail 스키마와 일치. FE·BE 공유.
export interface MeetingSummary {
  meetingId: number;
  title: string;
  status: MeetingStatus;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  /** ISO 8601 date-time */
  responseDeadline: string;
}

export interface MeetingDetail extends MeetingSummary {
  description: string | null;
  category: MeetingCategory;
  /** HH:mm */
  availableStartTime: string;
  /** HH:mm */
  availableEndTime: string;
  durationHours: number;
  /** format: uri — 초대 링크 */
  inviteUrl: string;
  /** ISO 8601 date-time — 미확정이면 null */
  confirmedStartAt: string | null;
  /** ISO 8601 date-time — 미확정이면 null */
  confirmedEndAt: string | null;
  participantCount: number;
}

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

// ── API DTO: 참여자 (PATCH /api/meetings/{meetingId}/participants/{participantId})
export interface Participant {
  participantId: number;
  guestName: string;
  participantType: ParticipantType;
  isRequired: boolean;
}

export interface SetParticipantRequiredRequest {
  isRequired: boolean;
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

// ── API DTO: 추천 결과 (GET /api/meetings/{meetingId}/recommendations) ──
// openapi.yaml 의 Recommendation 스키마와 일치. FE·BE 공유.
export interface Recommendation {
  rank: number;
  /** ISO 8601 date-time — 후보 구간 첫 슬롯 시작 */
  startAt: string;
  /** ISO 8601 date-time — 후보 구간 마지막 슬롯 끝 */
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

export interface RecommendationsResponse {
  meetingId: number;
  recommendations: Recommendation[];
}
