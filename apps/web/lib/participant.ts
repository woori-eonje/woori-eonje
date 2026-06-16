// 비회원 참여 — 등록(POST) + 클라이언트 식별 저장.
// 도메인: 참여자 식별은 닉네임이 아니라 participant_id + edit_token. edit_token 은 localStorage 에 보관.
import type {
  ParticipantRegistered,
  RegisterParticipantRequest,
} from "@whenwe/types";
import { apiPost, authPost } from "./api";

// useAuth=true (로그인 상태)면 Bearer 를 실어 보내 회원(MEMBER)으로 연동된다.
// 아니면 기존 비회원(GUEST) 등록. 회원은 응답을 edit_token 대신 JWT 로 식별한다.
export function registerParticipant(
  token: string,
  guestName: string,
  useAuth = false,
): Promise<ParticipantRegistered> {
  const body: RegisterParticipantRequest = { guestName };
  const path = `/api/invites/${encodeURIComponent(token)}/participants`;
  return useAuth
    ? authPost<ParticipantRegistered>(path, body)
    : apiPost<ParticipantRegistered>(path, body);
}

export interface StoredParticipant {
  participantId: number;
  /** 비회원(GUEST)의 응답 수정 토큰. 회원(MEMBER)은 JWT 로 식별하므로 null. */
  editToken: string | null;
  guestName: string;
}

const storageKey = (token: string) => `whenwe:participant:${token}`;

export function saveParticipant(token: string, p: StoredParticipant): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(token), JSON.stringify(p));
}

export function loadParticipant(token: string): StoredParticipant | null {
  const raw =
    typeof window === "undefined" ? null : localStorage.getItem(storageKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredParticipant;
  } catch {
    return null;
  }
}
