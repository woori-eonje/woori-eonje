"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { TopBar, Button, StatusPill } from "@/components/primitives";
import { Calendar, Share } from "@/components/icons";
import { getMeeting } from "@/lib/meetings";
import { ApiError, getToken } from "@/lib/api";
import type { MeetingDetail } from "@whenwe/types";

const TZ = "Asia/Seoul";

export default function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`); return; }
    getMeeting(Number(id))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
      })
      .then((m) => { if (m) setMeeting(m); });
  }, [id, router]);

  const handleCalendar = async () => {
    const token = (await import("@/lib/api")).getToken();
    if (!token) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${API_BASE}/api/meetings/${id}/calendar.ics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whenwe-${id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (meeting?.inviteUrl) navigator.clipboard.writeText(meeting.inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmedDateLine = meeting?.confirmedStartAt
    ? formatInTimeZone(meeting.confirmedStartAt, TZ, "M.d (EEE)", { locale: ko })
    : null;
  const confirmedTimeLine = (meeting?.confirmedStartAt && meeting?.confirmedEndAt)
    ? `${formatInTimeZone(meeting.confirmedStartAt, TZ, "a h:mm", { locale: ko })} – ${formatInTimeZone(meeting.confirmedEndAt, TZ, "h:mm")}`
    : null;

  return (
    <div className="screen">
      <TopBar
        title="확정된 일정"
        onBack={() => router.back()}
        right={<StatusPill status="CONFIRMED" />}
      />

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
          {/* Forest half-dome decoration */}
          <svg width="56" height="40" viewBox="0 0 64 48" style={{ position: "absolute", top: -8, right: -10, opacity: 0.9 }} aria-hidden="true">
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
            <circle cx="24" cy="22" r="2" fill="#fff" />
            <circle cx="40" cy="22" r="2" fill="#fff" />
            <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>

          <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>{meeting?.title ?? "모임"} · 확정</div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.04em" }}>
            {confirmedDateLine ?? <span className="skeleton" style={{ display: "inline-block", width: 80, height: 28, borderRadius: 8 }} />}<br />
            {confirmedTimeLine ?? <span className="skeleton" style={{ display: "inline-block", width: 140, height: 28, borderRadius: 8 }} />}
          </h2>
          <div className="dashed-divider" />
          <p className="t-body2">{meeting?.description ?? ""}</p>
        </div>

        {/* Participants */}
        <div className="card tight" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            참여자 {meeting?.participantCount ?? "–"}명
          </div>
          {!meeting && <div className="skeleton" style={{ height: 32, borderRadius: 8 }} />}
        </div>

        {/* Calendar row */}
        <div className="card tight" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--color-primary-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={20} color="var(--color-primary)" />
          </span>
          <div style={{ flex: 1 }}>
            <div className="t-body" style={{ fontWeight: 700 }}>캘린더에 추가</div>
            <div className="t-cap">Google · Apple · .ics 파일</div>
          </div>
          <button
            onClick={handleCalendar}
            style={{
              background: "var(--color-primary-soft)", color: "var(--color-primary)",
              border: "none", borderRadius: 10, padding: "6px 12px",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            다운로드
          </button>
        </div>

        {/* Info strip */}
        <div style={{
          background: "var(--color-primary-soft)", borderRadius: 14,
          padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: "var(--color-primary)", fontWeight: 600,
        }}>
          이 링크를 공유하면 참여자들도 확정된 일정을 확인할 수 있어요.
        </div>
      </div>

      <div className="bottom-bar">
        <Button
          block
          primary
          onClick={handleCopy}
          leftIcon={<Share size={18} color="#fff" />}
        >
          {copied ? "링크 복사됨!" : "공유 링크 복사"}
        </Button>
        <button
          onClick={() => router.push("/meetings")}
          style={{
            background: "transparent", border: "none",
            color: "var(--color-text-2)", fontFamily: "inherit",
            fontSize: 13, fontWeight: 600, padding: "6px 0",
            cursor: "pointer", textAlign: "center" as const, width: "100%",
          }}
        >
          내 모임 목록으로 →
        </button>
      </div>
    </div>
  );
}
