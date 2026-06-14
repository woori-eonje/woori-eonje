"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { TopBar, Button, StatusPill, type MeetingStatus as PillStatus } from "@/components/primitives";
import { Copy, Users, Clock, ChevronRight } from "@/components/icons";
import { getMeeting } from "@/lib/meetings";
import { ApiError, getToken } from "@/lib/api";
import type { MeetingDetail } from "@whenwe/types";

const TZ = "Asia/Seoul";

const CATEGORY_LABEL: Record<string, string> = {
  FRIEND: "친구 모임", STUDY: "스터디", BUSINESS: "비즈니스",
};

function deadlineLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "마감됨";
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "1시간 미만 남음";
  if (h < 24) return `${h}시간 남음`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간 남음`;
}

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    getMeeting(Number(id))
      .then(setMeeting)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
      });
  }, [id, router]);

  const handleCopy = () => {
    if (meeting?.inviteUrl) navigator.clipboard.writeText(meeting.inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startD = meeting ? new Date(meeting.startDate) : null;
  const endD = meeting ? new Date(meeting.endDate) : null;
  const dateRange = startD && endD
    ? `${startD.getMonth() + 1}.${startD.getDate()} — ${endD.getMonth() + 1}.${endD.getDate()}`
    : "–";

  return (
    <div className="screen">
      <TopBar
        title={meeting?.title ?? "모임"}
        onBack={() => router.push("/meetings")}
        right={meeting ? <StatusPill status={meeting.status as PillStatus} /> : undefined}
      />

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 모임 헤더 카드 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
          <svg width="48" height="36" viewBox="0 0 64 48" style={{ position: "absolute", top: -6, right: -8, opacity: 0.9 }} aria-hidden="true">
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
            <circle cx="24" cy="22" r="2" fill="#fff" />
            <circle cx="40" cy="22" r="2" fill="#fff" />
            <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>

          <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>
            {meeting ? CATEGORY_LABEL[meeting.category] : "–"}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.25 }}>
            {meeting?.title ?? <span className="skeleton" style={{ display: "inline-block", width: 140, height: 22, borderRadius: 6 }} />}
          </h2>
          {meeting?.description && (
            <p className="t-body2" style={{ margin: 0 }}>{meeting.description}</p>
          )}

          <div className="divider" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "조율 기간", value: dateRange },
              { label: "예상 소요", value: meeting ? `${meeting.durationHours}시간` : "–" },
              { label: "시간대", value: meeting ? `${meeting.availableStartTime} – ${meeting.availableEndTime}` : "–" },
              { label: "응답 마감", value: meeting ? formatInTimeZone(meeting.responseDeadline, TZ, "M.d (EEE) HH:mm", { locale: ko }) : "–" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="t-cap">{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 응답 현황 */}
        <div className="card tight" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12, flex: "none",
            background: "var(--color-primary-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users size={20} color="var(--color-primary)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {meeting ? `${meeting.participantCount}명 참여 중` : "–"}
            </div>
            <div className="t-cap">응답한 참여자 수</div>
          </div>
        </div>

        {/* 마감까지 */}
        <div className="card tight" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12, flex: "none",
            background: "var(--color-baby-blue)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock size={20} color="#1A4F87" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {meeting ? deadlineLeft(meeting.responseDeadline) : "–"}
            </div>
            <div className="t-cap">응답 마감까지</div>
          </div>
        </div>

        {/* 초대 링크 */}
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-line)",
          borderRadius: 16, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-cap">초대 링크</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--color-primary)",
              marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
            }}>
              {meeting?.inviteUrl ?? "–"}
            </div>
          </div>
          <button onClick={handleCopy} className="btn outline" style={{ height: 36, padding: "0 12px", fontSize: 13, flex: "none" }}>
            <Copy size={14} color="var(--color-primary)" />
            <span>{copied ? "복사됨!" : "복사"}</span>
          </button>
        </div>

        {/* 추천 결과 보기 */}
        <button
          onClick={() => router.push(`/meetings/${id}/recommendations`)}
          style={{
            width: "100%", textAlign: "left",
            background: "var(--color-surface)", border: "1px solid var(--color-line)",
            borderRadius: 16, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>추천 결과 보기</div>
            <div className="t-cap">지금까지 모인 응답으로 추천 시간 확인</div>
          </div>
          <ChevronRight size={18} color="var(--color-text-muted)" />
        </button>

      </div>

      <div className="bottom-bar">
        <Button block primary onClick={handleCopy} leftIcon={<Copy size={18} color="#fff" />}>
          {copied ? "링크 복사됨!" : "초대 링크 복사"}
        </Button>
      </div>
    </div>
  );
}
