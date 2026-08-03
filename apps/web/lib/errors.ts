import { ApiError } from "./api";

const ERROR_MESSAGES: Record<string, string> = {
  MEETING_NOT_FOUND: "모임을 찾을 수 없어요. 삭제되었거나 접근할 수 없는 모임일 수 있어요.",
  FORBIDDEN_MEETING_OWNER_ONLY: "모임장만 이 작업을 할 수 있어요.",
  MEETING_NOT_EDITABLE: "현재 상태에서는 모임을 수정할 수 없어요.",
  MEETING_ALREADY_CONFIRMED: "이미 확정된 모임이에요.",
  RECOMMENDATION_NOT_READY: "아직 추천 결과가 준비되지 않았어요.",
  MEETING_NOT_CONFIRMED: "아직 일정이 확정되지 않았어요.",
  RESPONSE_DEADLINE_PASSED: "응답 마감 시간이 지났어요.",
  PARTICIPANT_NOT_FOUND: "참여자를 찾을 수 없어요. 목록을 새로고침해 주세요.",
  PARTICIPANT_EDIT_TOKEN_INVALID: "참여자 인증 정보가 만료됐어요. 초대 링크에서 다시 접속해 주세요.",
  NETWORK_ERROR: "서버에 연결할 수 없어요. 네트워크 연결을 확인해 주세요.",
  BAD_RESPONSE: "서버 응답을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  INTERNAL_ERROR: "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return ERROR_MESSAGES[error.code] ?? error.message ?? fallback;
}
