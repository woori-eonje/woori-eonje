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

// 내 모임 목록에서 그 모임에 대한 내 역할 — 내가 만든 모임이면 ORGANIZER,
// 참여자로 등록된(MEMBER) 모임이면 PARTICIPANT.
export const MeetingRole = {
  ORGANIZER: 'ORGANIZER',
  PARTICIPANT: 'PARTICIPANT',
} as const;
export type MeetingRole = (typeof MeetingRole)[keyof typeof MeetingRole];

// ── 에러 코드 (기획서 24장) ────────────────────────────────────
export const ErrorCode = {
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',
  INVITE_TOKEN_INVALID: 'INVITE_TOKEN_INVALID',
  INVITE_TOKEN_EXPIRED: 'INVITE_TOKEN_EXPIRED',
  RESPONSE_DEADLINE_PASSED: 'RESPONSE_DEADLINE_PASSED',
  MEETING_ALREADY_CONFIRMED: 'MEETING_ALREADY_CONFIRMED',
  RESPONSE_ALREADY_EXISTS: 'RESPONSE_ALREADY_EXISTS',
  MEETING_NOT_EDITABLE: 'MEETING_NOT_EDITABLE',
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  PARTICIPANT_EDIT_TOKEN_INVALID: 'PARTICIPANT_EDIT_TOKEN_INVALID',
  PARTICIPANT_NICKNAME_TAKEN: 'PARTICIPANT_NICKNAME_TAKEN',
  INVALID_PARTICIPANT_CREDENTIALS: 'INVALID_PARTICIPANT_CREDENTIALS',
  PARTICIPANT_LOGIN_RATE_LIMITED: 'PARTICIPANT_LOGIN_RATE_LIMITED',
  FORBIDDEN_MEETING_OWNER_ONLY: 'FORBIDDEN_MEETING_OWNER_ONLY',
  RECOMMENDATION_NOT_READY: 'RECOMMENDATION_NOT_READY',
  MEETING_NOT_CONFIRMED: 'MEETING_NOT_CONFIRMED',
  // ── 인증(Auth) ──
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PASSWORD_RESET_TOKEN_INVALID: 'PASSWORD_RESET_TOKEN_INVALID',
  // ── 공통(입력 검증 실패 / 미분류 서버 오류) ──
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
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

export interface ForgotPasswordRequest {
  /** format: email */
  email: string;
}

export interface ResetPasswordRequest {
  /** 메일 링크의 원본 토큰 */
  token: string;
  /** 8~72자 */
  newPassword: string;
}

export interface WithdrawRequest {
  /** 현재 비밀번호 재확인 */
  password: string;
}

// ── API DTO: 모임 생성 (POST /api/meetings) ────────────────────
// openapi.yaml 의 CreateMeetingRequest/MeetingCreated 스키마와 일치. FE·BE 공유.
export interface CreateMeetingRequest {
  /** 1~100자 */
  title: string;
  /** ~500자, 없으면 null */
  description?: string | null;
  category: MeetingCategory;
  /** YYYY-MM-DD (기간은 최대 30일) */
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
  /**
   * 선택: 범위 내 특정 날짜들(YYYY-MM-DD)만 슬롯으로 생성한다.
   * 없으면 startDate~endDate 전체 범위를 사용. 각 날짜는 범위 안이어야 하고 중복 불가.
   */
  dates?: string[];
}

// 모임 수정(PATCH /api/meetings/{meetingId}) — 생성과 동일 필드 전체 교체.
// 응답자가 0명일 때만 허용되며, 날짜/시간/소요 변경 시 슬롯이 재생성된다.
export type UpdateMeetingRequest = CreateMeetingRequest;

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
  category: MeetingCategory;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  /** ISO 8601 date-time */
  responseDeadline: string;
  /** 전체 참여자 수 */
  participantCount: number;
  /** 응답을 제출한 distinct 참여자 수 (가능/애매/불가 중 하나라도 제출하면 포함 — '가능' 수가 아님) */
  respondedCount: number;
  /** 이 모임에 대한 내 역할 — 내가 만들었으면 ORGANIZER, 참여자(MEMBER)면 PARTICIPANT */
  role: MeetingRole;
}

export interface MeetingDetail extends MeetingSummary {
  description: string | null;
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
  /** ISO 8601 date-time — CONFIRMED 일 때만, 아니면 null */
  confirmedStartAt: string | null;
  /** ISO 8601 date-time — CONFIRMED 일 때만, 아니면 null */
  confirmedEndAt: string | null;
}

// ── API DTO: 비회원 참여자 등록 (POST /api/invites/{inviteToken}/participants)
export interface RegisterParticipantRequest {
  guestName: string;
  /** 비회원(GUEST) 등록 시 필수 — 숫자 4자리. 회원(Bearer) 등록에는 불필요. */
  pin?: string;
}

export interface ParticipantRegistered {
  participantId: number;
  guestName: string;
  /**
   * 비회원(GUEST) 응답 수정용 토큰 — 클라이언트(localStorage)에 저장.
   * 회원(MEMBER, Bearer 로 참여)은 JWT 로 본인 응답을 식별하므로 null.
   */
  participantEditToken: string | null;
}

export interface ParticipantSessionRequest {
  guestName: string;
  pin: string;
}

export interface ParticipantSessionResult {
  participantId: number;
  guestName: string;
  /** 비회원 세션은 항상 비어있지 않은 문자열(레거시 토큰 재사용 또는 그대로 유지). */
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

// ── API DTO: 참여자 목록 (GET /api/meetings/{meetingId}/participants) ──
export interface ParticipantWithStatus extends Participant {
  /** 가능시간을 1개라도 제출했는지 */
  hasResponded: boolean;
}

export interface ParticipantsResponse {
  participants: ParticipantWithStatus[];
}

// ── API DTO: 슬롯 / 가능시간 제출 (GET slots, POST availability) ────
export interface Slot {
  slotId: number;
  /** ISO 8601 date-time */
  startAt: string;
  /** ISO 8601 date-time */
  endAt: string;
}

/**
 * 소요시간 길이의 후보 구간(연속 N개 1시간 슬롯 묶음). FE 는 이 블록 단위로 선택 UX 를
 * 표시하고, 선택 시 slotIds 의 1시간 슬롯들을 같은 상태로 제출한다(DB·추천엔진은 1h 슬롯 유지).
 */
export interface SlotWindow {
  /** ISO 8601 date-time — 블록 시작(첫 슬롯 시작) */
  startAt: string;
  /** ISO 8601 date-time — 블록 끝(마지막 슬롯 끝) */
  endAt: string;
  /** 이 블록을 구성하는 1시간 슬롯 id들(연속, 길이 = durationHours) */
  slotIds: number[];
}

export interface SlotsResponse {
  meetingId: number;
  /** 예상 소요 시간(블록 길이 N) — FE 가 windows 표시에 사용 */
  durationHours: number;
  slots: Slot[];
  /** 소요시간 길이 블록 목록. 연속 슬롯이 부족하면 빈 배열. */
  windows: SlotWindow[];
}

// ── API DTO: 응답 현황 히트맵 (GET /api/meetings/{meetingId}/aggregate) ──
// 슬롯별 가능/애매/불가 카운트. 추천 엔진의 window 단위 집계와 달리 개별 1시간 슬롯 단위다.
export interface SlotAggregate {
  slotId: number;
  /** ISO 8601 date-time — 슬롯 시작 */
  startAt: string;
  /** 이 슬롯에 '가능'을 찍은 참여자 수 */
  availableCount: number;
  /** '애매' */
  maybeCount: number;
  /** '불가' */
  unavailableCount: number;
}

export interface AggregateResponse {
  meetingId: number;
  /** slotStartAt 오름차순. 응답 없는 슬롯도 카운트 0 으로 포함. */
  slots: SlotAggregate[];
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
  /** recommendation_results 행 id (confirm 요청에 사용). 재계산 시 바뀜. */
  recommendationId: number;
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

// ── API DTO: 참여자별 투표 상세 (GET /api/meetings/{meetingId}/vote-details) ──
// openapi.yaml 의 VoteDetailsResponse 스키마와 일치. FE·BE 공유. 모임장 전용.
// 추천 구간 상태는 AvailabilityStatus(가능/애매/불가) 에 없는 미응답(NO_RESPONSE)을
// 포함해야 해서 별도 유니온으로 둔다.
export const ParticipantWindowStatus = {
  AVAILABLE: 'AVAILABLE',
  MAYBE: 'MAYBE',
  UNAVAILABLE: 'UNAVAILABLE',
  NO_RESPONSE: 'NO_RESPONSE',
} as const;
export type ParticipantWindowStatus =
  (typeof ParticipantWindowStatus)[keyof typeof ParticipantWindowStatus];

export interface SlotVoteDetail {
  slotId: number;
  /** ISO 8601 date-time */
  startAt: string;
  /** ISO 8601 date-time */
  endAt: string;
  /** 이 슬롯에 응답을 남긴 참여자만 포함(미응답자는 없음) — aggregate 카운트와 합이 같다. */
  votes: Array<{ participantId: number; status: AvailabilityStatus }>;
}

export interface RecommendationParticipantDetail {
  recommendationId: number;
  /** 전체 참여자 포함 — 미응답자도 NO_RESPONSE 로 명시된다. */
  participantStatuses: Array<{
    participantId: number;
    status: ParticipantWindowStatus;
  }>;
}

export interface VoteDetailsResponse {
  meetingId: number;
  /** createdAt 오름차순 */
  participants: ParticipantWithStatus[];
  /** slotStartAt 오름차순 */
  slots: SlotVoteDetail[];
  recommendations: RecommendationParticipantDetail[];
}

// ── API DTO: 일정 확정 (POST /api/meetings/{meetingId}/confirm) ──
// openapi.yaml 의 ConfirmResult / 요청 스키마와 일치. FE·BE 공유.
export interface ConfirmMeetingRequest {
  /** 확정할 추천 결과(recommendation_results) 행 id */
  recommendationId: number;
}

export interface ConfirmResult {
  meetingId: number;
  status: MeetingStatus;
  /** ISO 8601 date-time — 확정된 구간 시작(추천 스냅샷) */
  confirmedStartAt: string;
  /** ISO 8601 date-time — 확정된 구간 끝(추천 스냅샷) */
  confirmedEndAt: string;
}
