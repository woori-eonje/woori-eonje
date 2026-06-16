"use client";

import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/primitives";
import { Calendar, Users, ChevronRight } from "@/components/icons";
import type { Meeting } from "@/types/meeting";

interface MeetingCardProps {
  meeting: Meeting;
  /** false 면 비대화형(클릭 이동 없음) — 참여한 모임은 아직 참여자 전용 상세 화면이 없어 정보용으로만 표시 */
  interactive?: boolean;
}

function resolveHref(meeting: Meeting): string {
  if (meeting.status === "CONFIRMED") return `/meetings/${meeting.id}/confirmed`;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (!isMobile) return `/meetings/${meeting.id}/dashboard`;
  if (meeting.status === "READY_TO_CONFIRM") return `/meetings/${meeting.id}/recommendations`;
  return `/meetings/${meeting.id}/status`;
}

export function MeetingCard({ meeting, interactive = true }: MeetingCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={interactive ? () => router.push(resolveHref(meeting)) : undefined}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 20, padding: 20,
        display: "flex", flexDirection: "column", gap: 12,
        cursor: interactive ? "pointer" : "default",
        transition: "box-shadow 160ms",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--color-primary-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
          }}>
            <Calendar size={20} color="var(--color-primary)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", letterSpacing: "0.04em" }}>
              {meeting.category === "friend" ? "친구" : meeting.category === "study" ? "스터디" : "비즈니스"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 1 }}>
              {meeting.title}
            </div>
          </div>
          <StatusPill status={meeting.status} />
        </div>

        <div className="divider" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div className="t-cap">조율 기간</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{meeting.dateRange}</div>
            </div>
            <div>
              <div className="t-cap">마감</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{meeting.deadline}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} color="var(--color-text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-2)" }}>
              {meeting.responseCount}/{meeting.totalCount}명
            </span>
          </div>
        </div>

        {meeting.status === "READY_TO_CONFIRM" && (
          <div style={{
            background: "var(--color-maybe-soft)", border: "1px solid var(--color-maybe)",
            borderRadius: 10, padding: "8px 12px",
            fontSize: 13, fontWeight: 700, color: "var(--color-maybe-text)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            모든 응답이 모였어요. 지금 확정해보세요.
            <ChevronRight size={16} color="var(--color-maybe-text)" />
          </div>
        )}
    </div>
  );
}
