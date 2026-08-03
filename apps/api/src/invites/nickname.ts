// 참여 PIN 재접속에서 "같은 사람"을 판별하는 키로 쓰는 정규화 닉네임.
// 표시용 guestName 원문은 그대로 저장·반환한다.
export function normalizeNickname(guestName: string): string {
  return guestName.trim().replace(/\s+/g, ' ').toLowerCase();
}
