// 비회원 참여 — 등록(POST) + 클라이언트 식별 저장.
// 도메인: 참여자 식별은 닉네임이 아니라 participant_id + edit_token. edit_token 은 localStorage 에 보관.
import type {
  ParticipantRegistered,
  RegisterParticipantRequest,
} from "@whenwe/types";
import { apiPost } from "./api";

export function registerParticipant(
  token: string,
  guestName: string,
): Promise<ParticipantRegistered> {
  const body: RegisterParticipantRequest = { guestName };
  return apiPost<ParticipantRegistered>(
    `/api/invites/${encodeURIComponent(token)}/participants`,
    body,
  );
}

export interface StoredParticipant {
  participantId: number;
  editToken: string;
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
