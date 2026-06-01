"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo, StatusPill } from "@/components/primitives";
import { PlusCircle, ChevronRight, Calendar, Users } from "@/components/icons";

type TabKey = "active" | "confirm" | "confirmed" | "closed";

interface Meeting {
  id: string;
  title: string;
  category: string;
  status: "COLLECTING" | "READY_TO_CONFIRM" | "CONFIRMED" | "CLOSED";
  dateRange: string;
  deadline: string;
  responseCount: number;
  totalCount: number;
}

const MEETINGS: Meeting[] = [
  { id: "1", title: "6월 전시 모임", category: "친구", status: "COLLECTING",       dateRange: "6.1 — 6.14", deadline: "5.30", responseCount: 5, totalCount: 6 },
  { id: "2", title: "7월 스터디 킥오프", category: "스터디", status: "READY_TO_CONFIRM", dateRange: "7.1 — 7.7",  deadline: "6.28", responseCount: 8, totalCount: 8 },
  { id: "3", title: "팀 회의", category: "비즈니스", status: "CONFIRMED",      dateRange: "6.15", deadline: "확정됨",   responseCount: 4, totalCount: 4 },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "active",    label: "진행 중" },
  { key: "confirm",   label: "확정 필요" },
  { key: "confirmed", label: "확정됨" },
  { key: "closed",    label: "지난 모임" },
];

const FILTER: Record<TabKey, Meeting["status"][]> = {
  active:    ["COLLECTING"],
  confirm:   ["READY_TO_CONFIRM"],
  confirmed: ["CONFIRMED"],
  closed:    ["CLOSED"],
};

function EmptyMeetings({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, { title: string; sub: string }> = {
    active:    { title: "진행 중인 모임이 없어요", sub: "새 모임을 만들어 일정을 조율해보세요." },
    confirm:   { title: "확정이 필요한 모임이 없어요", sub: "응답이 마감된 모임이 여기 나타나요." },
    confirmed: { title: "확정된 모임이 없어요", sub: "일정이 확정되면 여기서 확인할 수 있어요." },
    closed:    { title: "지난 모임이 없어요", sub: "종료된 모임이 여기에 보관돼요." },
  };
  const msg = messages[tab];
  return (
    <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      {/* Decorative shapes */}
      <div style={{ position: "relative", width: 80, height: 60 }}>
        <svg width="48" height="36" viewBox="0 0 64 48" style={{ position: "absolute", top: 0, left: 16 }} aria-hidden="true">
          <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="var(--color-baby-blue)" />
        </svg>
        <svg width="28" height="24" viewBox="0 0 36 36" style={{ position: "absolute", top: 4, right: 0 }} aria-hidden="true">
          <path d="M18 0 L20 14 L34 16 L20 18 L18 36 L16 18 L2 16 L16 14 Z" fill="var(--color-lavender)" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)" }}>{msg.title}</div>
      <div className="t-body2">{msg.sub}</div>
      {tab === "active" && (
        <Link href="/meetings/new" className="btn primary" style={{ marginTop: 8 }}>
          <PlusCircle size={16} color="#fff" />
          <span>새 모임 만들기</span>
        </Link>
      )}
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const href = meeting.status === "CONFIRMED"
    ? `/meetings/${meeting.id}/confirmed`
    : `/meetings/${meeting.id}/recommendations`;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 20, padding: 20,
        display: "flex", flexDirection: "column", gap: 12,
        cursor: "pointer",
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", letterSpacing: "0.04em" }}>{meeting.category}</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 1 }}>{meeting.title}</div>
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
    </Link>
  );
}

export default function MyMeetingsPage() {
  const [tab, setTab] = useState<TabKey>("active");
  const filtered = MEETINGS.filter((m) => FILTER[tab].includes(m.status));

  return (
    <div className="screen">
      {/* Header */}
      <div style={{
        padding: "14px 20px 0",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-line)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 }}>
          <Logo size={24} />
          <Link href="/meetings/new" className="btn primary" style={{ height: 36, padding: "0 14px", fontSize: 13 }}>
            <PlusCircle size={15} color="#fff" />
            <span>새 모임</span>
          </Link>
        </div>
        <div className="tab-bar" style={{ borderBottom: "none" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "active" : ""}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0
          ? <EmptyMeetings tab={tab} />
          : filtered.map((m) => <MeetingCard key={m.id} meeting={m} />)
        }
      </div>
    </div>
  );
}
