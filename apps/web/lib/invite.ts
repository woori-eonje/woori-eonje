// 초대 진입 슬라이스의 데이터 계층 — 계약 DTO(InvitePublic) 를 화면 뷰모델로 변환.
// 표시용 포맷(기간/마감 라벨 등)은 '화면' 책임이라 계약이 아니라 여기서 만든다(2층).
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import type { InvitePublic, MeetingCategory } from "@whenwe/types";
import { apiGet } from "./api";

// 서비스 기준 타임존. 어댑터가 SSR(서버)에서 실행되므로 실행 환경 TZ에 의존하지 않도록 고정한다.
const TZ = "Asia/Seoul";

const CATEGORY_LABEL: Record<MeetingCategory, string> = {
  FRIEND: "친구 모임",
  STUDY: "스터디",
  BUSINESS: "비즈니스",
};

export interface InviteVM {
  categoryLabel: string;
  title: string;
  description: string | null;
  /** "6.1 — 6.14" */
  periodLabel: string;
  /** "2시간" */
  durationLabel: string;
  /** "18:00 – 23:00" */
  timeWindowLabel: string;
  /** "6.12 (금) 23:59" */
  deadlineLabel: string;
}

/** "2026-06-01" → "6.1" */
function monthDay(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}.${Number(d)}`;
}

export function toInviteVM(dto: InvitePublic): InviteVM {
  return {
    categoryLabel: CATEGORY_LABEL[dto.category],
    title: dto.title,
    description: dto.description,
    periodLabel: `${monthDay(dto.startDate)} — ${monthDay(dto.endDate)}`,
    durationLabel: `${dto.durationHours}시간`,
    timeWindowLabel: `${dto.availableStartTime} – ${dto.availableEndTime}`,
    deadlineLabel: formatInTimeZone(
      dto.responseDeadline,
      TZ,
      "M.d (EEE) HH:mm",
      { locale: ko },
    ),
  };
}

export function fetchInvite(token: string): Promise<InvitePublic> {
  return apiGet<InvitePublic>(`/api/invites/${encodeURIComponent(token)}`);
}
