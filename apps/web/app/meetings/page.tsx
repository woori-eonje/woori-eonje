"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/primitives";
import { PlusCircle } from "@/components/icons";
import { MeetingCard } from "@/components/meeting/MeetingCard";
import type { Meeting } from "@/types/meeting";
import { listMeetings } from "@/lib/meetings";
import { logout } from "@/lib/auth";
import { ApiError, getToken } from "@/lib/api";
import type { MeetingSummary, MeetingCategory } from "@whenwe/types";

type RoleKey = "ORGANIZER" | "PARTICIPANT";

const CATEGORY_MAP: Record<MeetingCategory, Meeting["category"]> = {
  FRIEND: "friend",
  STUDY: "study",
  BUSINESS: "business",
};

type TabKey = "active" | "confirm" | "confirmed" | "closed";

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

function toMeeting(s: MeetingSummary): Meeting {
  const deadline = new Date(s.responseDeadline);
  const deadlineLabel = `${deadline.getMonth() + 1}.${deadline.getDate()}`;
  const startD = new Date(s.startDate);
  const endD = new Date(s.endDate);
  const dateRange = `${startD.getMonth() + 1}.${startD.getDate()} — ${endD.getMonth() + 1}.${endD.getDate()}`;

  return {
    id: String(s.meetingId),
    title: s.title,
    category: CATEGORY_MAP[s.category] ?? "friend",
    status: s.status as unknown as Meeting["status"],
    dateRange,
    startDate: s.startDate,
    endDate: s.endDate,
    deadline: deadlineLabel,
    responseDeadline: s.responseDeadline,
    responseCount: s.respondedCount,
    totalCount: s.participantCount,
    role: s.role,
  };
}

function EmptyMeetings({ tab, role }: { tab: TabKey; role: RoleKey }) {
  if (role === "PARTICIPANT") {
    return (
      <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)" }}>참여한 모임이 없어요</div>
        <div className="t-body2">초대 링크로 로그인해서 참여하면 여기에 모여요.</div>
      </div>
    );
  }
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

export default function MyMeetingsPage() {
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<RoleKey>("ORGANIZER");
  const [tab, setTab] = useState<TabKey>("active");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout().catch(() => {});
    router.push("/login");
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
      return;
    }
    setLoading(true);
    listMeetings()
      .then((list) => {
        setMeetings(list.map(toMeeting));
      })
      .catch((e) => {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
          router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
        } else {
          setError(e instanceof ApiError ? e.message : "모임 목록을 불러올 수 없어요.");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  // 어느 상태 버킷에도 속하지 않는 status(예: 미사용 DRAFT, 향후 추가 enum)는
  // '진행 중' 탭으로 흡수해 목록에서 조용히 사라지지 않게 한다.
  const KNOWN_STATUSES = new Set(Object.values(FILTER).flat());
  const filtered = meetings.filter((m) => {
    if ((m.role ?? "ORGANIZER") !== roleTab) return false;
    if (FILTER[tab].includes(m.status)) return true;
    return tab === "active" && !KNOWN_STATUSES.has(m.status);
  });

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
          <button
            onClick={handleLogout}
            style={{
              background: "transparent", border: "none",
              color: "var(--color-text-muted)", fontFamily: "inherit",
              fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0",
            }}
          >
            로그아웃
          </button>
        </div>
        {/* 역할 전환 — 내가 만든 / 참여한 */}
        <div style={{ display: "inline-flex", gap: 4, padding: 3, background: "var(--color-bg-2)", borderRadius: 999, marginBottom: 12 }}>
          {([
            { key: "ORGANIZER" as RoleKey, label: "내가 만든" },
            { key: "PARTICIPANT" as RoleKey, label: "참여한" },
          ]).map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleTab(r.key)}
              style={{
                height: 32, padding: "0 16px", borderRadius: 999, border: 0,
                background: roleTab === r.key ? "var(--color-surface)" : "transparent",
                color: roleTab === r.key ? "var(--color-primary)" : "var(--color-text-2)",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em",
                cursor: "pointer",
                boxShadow: roleTab === r.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "background 160ms, color 160ms",
              }}
            >
              {r.label}
            </button>
          ))}
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
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
            <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
          </>
        ) : error ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p className="t-body2" style={{ marginBottom: 12 }}>{error}</p>
            <button
              className="btn outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                listMeetings()
                  .then((list) => setMeetings(list.map(toMeeting)))
                  .catch((e) => setError(e instanceof ApiError ? e.message : "다시 시도해주세요."))
                  .finally(() => setLoading(false));
              }}
            >
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyMeetings tab={tab} role={roleTab} />
        ) : (
          filtered.map((m) => (
            <MeetingCard key={m.id} meeting={m} interactive={roleTab === "ORGANIZER"} />
          ))
        )}
      </div>

      {/* 플로팅 새 모임 버튼 */}
      <Link
        href="/meetings/new"
        style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 50,
          width: 56, height: 56, borderRadius: 999,
          background: "var(--color-primary)", color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(26,149,98,0.35)",
          textDecoration: "none",
          transition: "transform 160ms, box-shadow 160ms",
        }}
        aria-label="새 모임 만들기"
      >
        <PlusCircle size={26} color="#fff" />
      </Link>
    </div>
  );
}
