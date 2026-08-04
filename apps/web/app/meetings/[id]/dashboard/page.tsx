"use client";

import { use, useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { Logo, Button } from "@/components/primitives";
import { MeetingActions } from "@/components/meeting/MeetingActions";
import { Check, Clock, PlusCircle, Copy } from "@/components/icons";
import { getMeeting, getRecommendations, confirmMeeting, getAggregate, getVoteDetails, listParticipants, setParticipantRequired, deleteParticipant } from "@/lib/meetings";
import { ApiError, getToken } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { AvailabilityStatus, MeetingDetail, ParticipantWindowStatus, Recommendation as ApiRec, SlotAggregate, ParticipantWithStatus, VoteDetailsResponse } from "@whenwe/types";

const TZ = "Asia/Seoul";
const CATEGORY_LABEL: Record<string, string> = {
  FRIEND: "친구 모임", STUDY: "스터디", BUSINESS: "비즈니스",
};
function fmtTime(iso: string) { return formatInTimeZone(iso, TZ, "a h:mm", { locale: ko }); }
function fmtDateLabel(iso: string) { return formatInTimeZone(iso, TZ, "M월 d일 EEEE", { locale: ko }); }
function fmtDeadlineLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "마감됨";
  const h = Math.floor(diff / 3600000);
  return h < 24 ? `${h}시간 남음` : `${Math.floor(h / 24)}일 ${h % 24}시간 남음`;
}

/* ── 히트맵 셀 색 (가능 인원 수 기준) ── */
function cellBg(ok: number) {
  if (ok >= 5) return { bg: "#1A9562",                color: "#fff" };
  if (ok === 4) return { bg: "rgba(26,149,98,0.45)",  color: "#fff" };
  if (ok === 3) return { bg: "rgba(26,149,98,0.22)",  color: "var(--color-text)" };
  if (ok === 2) return { bg: "rgba(183,211,255,0.55)",color: "var(--color-text)" };
  if (ok === 1) return { bg: "rgba(214,231,255,0.55)",color: "var(--color-text-2)" };
  return { bg: "transparent", color: "var(--color-text-2)" };
}

type Tab = "aggregate" | "recommendations";

const DETAIL_STATUS = [
  { key: "AVAILABLE", label: "가능", color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  { key: "MAYBE", label: "애매", color: "var(--color-maybe-text)", bg: "var(--color-maybe-soft)" },
  { key: "UNAVAILABLE", label: "불가", color: "var(--color-text-2)", bg: "var(--color-bg-2)" },
  { key: "NO_RESPONSE", label: "미응답", color: "var(--color-text-muted)", bg: "var(--color-bg-2)" },
] as const;

function ParticipantStatusDetails({
  statuses,
  details,
}: {
  statuses: Array<{ participantId: number; status: ParticipantWindowStatus | AvailabilityStatus }>;
  details: VoteDetailsResponse;
}) {
  const names = new Map(details.participants.map((participant) => [participant.participantId, participant]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
      {DETAIL_STATUS.map(({ key, label, color, bg }) => {
        const people = statuses.filter((item) => item.status === key).map((item) => names.get(item.participantId)).filter(Boolean);
        if (people.length === 0) return null;
        return (
          <div key={key}>
            <div style={{ fontSize: 11, fontWeight: 800, color, marginBottom: 5 }}>{label} {people.length}명</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {people.map((person) => person && (
                <span key={person.participantId} style={{ padding: "4px 8px", borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700 }}>
                  {person.guestName}{person.isRequired ? " · 필수" : ""}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   앱 헤더
══════════════════════════════════════════════════════ */
function AppHeader() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    const { logout } = await import("@/lib/auth");
    await logout().catch(() => {});
    router.push("/login");
  };

  return (
    <header className="dashboard-header" style={{
      height: 68,
      background: "var(--color-surface)",
      borderBottom: "1px solid var(--color-line)",
      display: "flex", alignItems: "center", gap: 20,
      padding: "0 32px",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <Link href="/meetings" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
        <Logo size={24} />
      </Link>

      {/* 내비게이션 */}
      <nav className="dashboard-nav" style={{ display: "flex", gap: 4, marginLeft: 24 }}>
        <Link href="/meetings" style={{
          height: 36, padding: "0 16px",
          display: "inline-flex", alignItems: "center",
          color: "var(--color-primary)",
          textDecoration: "none",
          fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em",
          whiteSpace: "nowrap" as const,
          borderRadius: 999,
          background: "var(--color-primary-soft)",
        }}>
          내 모임
        </Link>
      </nav>

      <span style={{ flex: 1 }} />

      {/* 새 모임 버튼 */}
      <Link href="/meetings/new" style={{
        height: 36, padding: "0 14px",
        borderRadius: 999, border: 0,
        background: "var(--color-primary)", color: "#fff",
        fontFamily: "inherit", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.015em", cursor: "pointer",
        whiteSpace: "nowrap" as const,
        display: "inline-flex", alignItems: "center", gap: 6,
        textDecoration: "none",
        transition: "background 160ms",
      }}>
        <PlusCircle size={14} color="#fff" />
        새 모임
      </Link>

      {/* 아바타 + 로그아웃 메뉴 */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: "var(--color-primary-soft)", color: "var(--color-primary)",
            fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          내
        </button>
        {showMenu && (
          <div style={{
            position: "absolute", top: 44, right: 0,
            background: "var(--color-surface)", border: "1px solid var(--color-line)",
            borderRadius: 12, padding: 6, minWidth: 110,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 100,
          }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%", textAlign: "left",
                background: "transparent", border: "none",
                padding: "8px 12px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: "var(--color-text-2)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════
   미팅 히어로 스트립
══════════════════════════════════════════════════════ */
function MeetingHero({ meeting, onUpdated }: { meeting: MeetingDetail | null; onUpdated?: (m: MeetingDetail) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const handleCopy = async () => {
    if (!meeting?.inviteUrl) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(meeting.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("링크를 복사하지 못했어요.");
    }
  };

  const startD = meeting ? new Date(meeting.startDate) : null;
  const endD = meeting ? new Date(meeting.endDate) : null;
  const dateRange = startD && endD
    ? `${startD.getMonth() + 1}.${startD.getDate()} — ${endD.getMonth() + 1}.${endD.getDate()}`
    : "–";

  return (
    <div className="meeting-hero" style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: 24,
      padding: "24px 28px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      position: "relative",
      overflow: "hidden",
      marginBottom: 24,
    }}>
      {/* Baby Blue 그라데이션 accent */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, right: 0,
        width: 260,
        background: "linear-gradient(110deg, transparent 0%, var(--color-baby-blue) 100%)",
        opacity: 0.55,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        pointerEvents: "none",
      }} aria-hidden="true" />

      {/* 장식 SVG */}
      <svg width="44" height="34" viewBox="0 0 64 48" style={{ position: "absolute", top: 22, right: 30, opacity: 0.95, zIndex: 1 }} aria-hidden="true">
        <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562"/>
        <circle cx="24" cy="22" r="2" fill="#fff"/><circle cx="40" cy="22" r="2" fill="#fff"/>
        <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
      <svg width="50" height="40" viewBox="0 0 76 62" style={{ position: "absolute", bottom: 12, right: 100, zIndex: 1 }} aria-hidden="true">
        <g fill="#E6DBF7">
          <circle cx="14" cy="36" r="14"/><circle cx="30" cy="20" r="14"/>
          <circle cx="48" cy="18" r="16"/><circle cx="62" cy="36" r="14"/>
          <circle cx="38" cy="46" r="16"/>
        </g>
      </svg>

      {/* 모임 정보 */}
      <div className="meeting-hero-content" style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--color-primary)" }}>
          {meeting ? CATEGORY_LABEL[meeting.category] : <span className="skeleton" style={{ display: "inline-block", width: 60, height: 14, borderRadius: 4 }} />}
        </div>
        <h1 className="meeting-hero-title" style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.25 }}>
          {meeting?.title ?? <span className="skeleton" style={{ display: "inline-block", width: 160, height: 26, borderRadius: 8 }} />}
        </h1>
        <p className="meeting-hero-description" style={{ margin: "8px 0 0", fontSize: 14, color: "var(--color-text-2)", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
          {meeting?.description ?? ""}
        </p>
        <div className="meeting-hero-meta" style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" as const }}>
          {[
            { label: "조율 기간", value: dateRange },
            { label: "예상 소요", value: meeting ? `${meeting.durationHours}시간` : "–" },
            { label: "참여자",    value: meeting ? `${meeting.participantCount}명` : "–", color: "var(--color-primary)" },
            { label: "마감까지", value: meeting ? fmtDeadlineLeft(meeting.responseDeadline) : "–" },
          ].map(({ label, value, color }) => (
            <span className="meeting-hero-meta-item" key={label} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, fontSize: 13, color: "var(--color-text-2)", whiteSpace: "nowrap" as const }}>
              {label} <b style={{ color: color ?? "var(--color-text)", fontWeight: 700 }}>{value}</b>
            </span>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="meeting-hero-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const, flex: "none", position: "relative", zIndex: 1 }}>
        <span className="pill ok">
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-primary)", display: "inline-block" }} />
          응답 수집 중
        </span>
        <button onClick={handleCopy} style={{
          height: 44, padding: "0 18px", borderRadius: 14,
          border: "1px solid var(--color-primary)", background: "#fff",
          color: "var(--color-primary)", fontFamily: "inherit",
          fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em",
          cursor: "pointer", whiteSpace: "nowrap" as const,
          display: "inline-flex", alignItems: "center", gap: 8,
          transition: "background 160ms",
        }}>
          <Copy size={15} color="var(--color-primary)" /> {copied ? "복사됨!" : "링크 복사"}
        </button>
        {meeting && <MeetingActions meeting={meeting} onUpdated={onUpdated} />}
        {copyError && <span role="alert" className="t-cap" style={{ color: "var(--color-error)", width: "100%" }}>{copyError}</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   탭 스위처
══════════════════════════════════════════════════════ */
function PageTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="dashboard-tabs" style={{
      display: "inline-flex",
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: 14,
      padding: 4, gap: 2,
      marginBottom: 24,
    }}>
      {([
        { key: "aggregate",       label: "응답 현황" },
        { key: "recommendations", label: "추천 결과" },
      ] as const).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          style={{
            height: 40, padding: "0 18px",
            background: tab === key ? "var(--color-primary-soft)" : "transparent",
            border: 0, borderRadius: 10,
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            letterSpacing: "-0.015em",
            color: tab === key ? "var(--color-primary)" : "var(--color-text-2)",
            cursor: "pointer", whiteSpace: "nowrap" as const,
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "background 160ms, color 160ms",
          }}
        >
          <Clock size={15} color={tab === key ? "var(--color-primary)" : "var(--color-text-2)"} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   응답 현황 탭 — 히트맵
══════════════════════════════════════════════════════ */
function AggregateTab({ slots, meeting, voteDetails, voteDetailsError, error, onRetry, onVoteDetailsRetry }: {
  slots: SlotAggregate[] | null;
  meeting: MeetingDetail | null;
  voteDetails: VoteDetailsResponse | null;
  voteDetailsError: boolean;
  error: boolean;
  onRetry: () => void;
  onVoteDetailsRetry: () => void;
}) {
  // 슬롯(실데이터)에서 날짜·시간 격자와 셀 맵을 KST 기준으로 동적 생성.
  // (hook 은 조건부 return 보다 위에 있어야 하므로 slots 가 null 이어도 안전하게 [] 로 처리)
  const { days, hours, cellMap } = useMemo(() => {
    const dayMap = new Map<string, { id: string; weekday: string; sort: number }>();
    const hourSet = new Set<string>();
    const cellMap = new Map<string, SlotAggregate>();
    for (const s of slots ?? []) {
      const dKey = formatInTimeZone(s.startAt, TZ, "M.d");
      const hKey = formatInTimeZone(s.startAt, TZ, "HH:mm");
      if (!dayMap.has(dKey)) {
        dayMap.set(dKey, {
          id: dKey,
          weekday: formatInTimeZone(s.startAt, TZ, "EEE", { locale: ko }),
          sort: new Date(s.startAt).getTime(),
        });
      }
      hourSet.add(hKey);
      cellMap.set(`${dKey}_${hKey}`, s);
    }
    return {
      days: [...dayMap.values()].sort((a, b) => a.sort - b.sort),
      hours: [...hourSet].sort(),
      cellMap,
    };
  }, [slots]);

  // 기본 선택: 가능 인원이 가장 많은 슬롯.
  const defaultKey = useMemo(() => {
    let best: SlotAggregate | null = null;
    for (const s of slots ?? []) if (!best || s.availableCount > best.availableCount) best = s;
    return best
      ? `${formatInTimeZone(best.startAt, TZ, "M.d")}_${formatInTimeZone(best.startAt, TZ, "HH:mm")}`
      : null;
  }, [slots]);

  const [picked, setPicked] = useState<string | null>(null);
  const activeKey = picked ?? defaultKey;
  const pickedData = activeKey ? cellMap.get(activeKey) ?? null : null;
  const [pickedDay, pickedHour] = activeKey ? activeKey.split("_") : ["", ""];
  const pickedWeekday = days.find((d) => d.id === pickedDay)?.weekday ?? "";
  const pickedVotes = pickedData
    ? voteDetails?.slots.find((slot) => slot.slotId === pickedData.slotId)?.votes ?? []
    : [];

  const respondedCount = meeting?.respondedCount ?? 0;
  const participantCount = meeting?.participantCount ?? 0;
  const pct = participantCount > 0 ? Math.round((respondedCount / participantCount) * 100) : 0;

  // 에러: 빈 상태로 위장하지 않고 명시 + 재시도.
  if (error) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <p className="t-body2" style={{ marginBottom: 14 }}>응답 현황을 불러오지 못했어요.</p>
        <Button onClick={onRetry}>다시 시도</Button>
      </div>
    );
  }
  // 로딩(아직 fetch 전): 스켈레톤 격자 — 빈 상태와 구분.
  if (slots === null) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <span className="skeleton" style={{ display: "block", width: 280, height: 22, borderRadius: 8, marginBottom: 22 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="skeleton" style={{ display: "block", height: 42, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }
  if (slots.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <p className="t-body2">아직 응답할 수 있는 슬롯이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* 히트맵 */}
      <div className="card dashboard-primary-card" style={{ padding: 28, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap" as const, gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.3 }}>언제 가장 많이 모일 수 있을까요?</h2>
            <p className="t-body2" style={{ marginTop: 6 }}>색이 진할수록 더 많은 사람이 가능해요. 셀을 누르면 상세를 보여드릴게요.</p>
          </div>
          {/* 범례 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--color-text-2)", flexWrap: "wrap" as const }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-line)" }}>
                <span style={{ width: 18, height: 14, background: "rgba(214,231,255,0.55)", display: "block" }} />
                <span style={{ width: 18, height: 14, background: "rgba(183,211,255,0.55)", display: "block" }} />
              </span>
              1–2명 가능
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-line)" }}>
                <span style={{ width: 18, height: 14, background: "rgba(26,149,98,0.22)", display: "block" }} />
                <span style={{ width: 18, height: 14, background: "rgba(26,149,98,0.45)", display: "block" }} />
                <span style={{ width: 18, height: 14, background: "#1A9562", display: "block" }} />
              </span>
              3명 이상 — 추천 가능
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 14, border: "1px dashed var(--color-maybe)", borderRadius: 3, display: "inline-block" }} />
              애매 포함
            </span>
          </div>
        </div>

        <div className="dashboard-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 5, fontFamily: "inherit", minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ width: 52 }} />
                {days.map((d) => (
                  <th key={d.id} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", padding: "4px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)" }}>{d.weekday}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>{d.id}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h}>
                  <td style={{ fontSize: 11, color: "var(--color-text-2)", textAlign: "right", paddingRight: 8, verticalAlign: "middle", whiteSpace: "nowrap" as const }}>{h}</td>
                  {days.map((d) => {
                    const key = `${d.id}_${h}`;
                    const data = cellMap.get(key);
                    const ok = data?.availableCount ?? 0;
                    const maybe = data?.maybeCount ?? 0;
                    const isPicked = activeKey === key;
                    const { bg, color } = cellBg(ok);
                    return (
                      <td key={key} style={{ padding: 0 }}>
                        <button
                          type="button"
                          onClick={() => data && setPicked(key)}
                          disabled={!data}
                          aria-label={`${d.weekday} ${d.id} ${h} 가능 ${ok}명`}
                          style={{
                            width: "100%", height: 42,
                            border: maybe > 0 ? "1px dashed var(--color-maybe)" : `1px solid ${data ? (ok > 0 ? "transparent" : "var(--color-line)") : "var(--color-line)"}`,
                            padding: 0, cursor: data ? "pointer" : "default",
                            borderRadius: 8,
                            fontSize: 13, fontWeight: 700,
                            background: data ? bg : "var(--color-bg-2)",
                            color,
                            opacity: data ? 1 : 0.4,
                            outline: isPicked ? "2px solid var(--color-primary)" : "none",
                            outlineOffset: 1,
                            transition: "outline 80ms, box-shadow 120ms",
                          }}
                        >
                          {ok > 0 ? ok : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 사이드 레일 */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card tight" style={{ padding: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>선택한 시간</div>
          {pickedData ? (
            <>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, letterSpacing: "-0.025em" }}>
                {pickedDay} ({pickedWeekday}) {pickedHour}
              </h3>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" as const }}>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 22, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>{pickedData.availableCount}</b>
                  <span style={{ fontSize: 12, color: "var(--color-primary)" }}>가능</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-maybe-text)" }}>{pickedData.maybeCount}</b>
                  <span style={{ fontSize: 12, color: "var(--color-maybe-text)" }}>애매</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-muted)" }}>{pickedData.unavailableCount}</b>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>불가</span>
                </span>
              </div>
              {voteDetails && <ParticipantStatusDetails statuses={pickedVotes} details={voteDetails} />}
              {!voteDetails && !voteDetailsError && <div className="skeleton" style={{ height: 56, borderRadius: 8, marginTop: 14 }} />}
              {voteDetailsError && (
                <div style={{ marginTop: 14 }}>
                  <p role="alert" className="t-cap" style={{ marginBottom: 8 }}>참여자 상세를 불러오지 못했어요.</p>
                  <Button onClick={onVoteDetailsRetry}>다시 시도</Button>
                </div>
              )}
            </>
          ) : (
            <p className="t-body2">히트맵에서 시간을 누르면 상세 정보가 보여요.</p>
          )}
        </div>

        <div className="card tight" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: -20, right: -16, width: 70, height: 70, borderRadius: 999, background: "var(--color-baby-blue)", opacity: 0.55 }} aria-hidden="true" />
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>응답 현황</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.03em" }}>{respondedCount}</span>
            <span className="t-body2">/ {participantCount}명</span>
          </div>
          <div style={{ height: 8, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-primary)", borderRadius: 999 }} />
          </div>
          {meeting && (
            <p className="t-cap" style={{ marginTop: 10 }}>
              마감 {fmtDateLabel(meeting.responseDeadline)} · {fmtDeadlineLeft(meeting.responseDeadline)}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   필수 참석자 패널
══════════════════════════════════════════════════════ */
function RequiredParticipantsPanel({
  meetingId,
  onRecommendationsChanged,
  onParticipantsChanged,
}: {
  meetingId: number;
  onRecommendationsChanged: () => void;
  onParticipantsChanged: () => void;
}) {
  const [participants, setParticipants] = useState<ParticipantWithStatus[] | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParticipantWithStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const fetchParticipants = useCallback(() => {
    listParticipants(meetingId)
      .then((res) => setParticipants(res.participants))
      .catch((error) => setParticipantsError(getApiErrorMessage(error, "참여자 목록을 불러오지 못했어요.")));
  }, [meetingId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleToggle = async (p: ParticipantWithStatus) => {
    if (toggling !== null) return;
    setToggling(p.participantId);
    setToggleError(null);
    try {
      const updated = await setParticipantRequired(meetingId, p.participantId, !p.isRequired);
      setParticipants((prev) =>
        prev?.map((x) =>
          x.participantId === updated.participantId ? { ...x, isRequired: updated.isRequired } : x,
        ) ?? prev,
      );
      onRecommendationsChanged();
    } catch (error) {
      setToggleError(getApiErrorMessage(error, "필수 참석자 설정을 변경하지 못했어요."));
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteParticipant(meetingId, deleteTarget.participantId);
      setParticipants((current) => current?.filter((p) => p.participantId !== deleteTarget.participantId) ?? current);
      setDeleteTarget(null);
      onRecommendationsChanged();
      onParticipantsChanged();
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "참여자를 삭제하지 못했어요."));
    } finally {
      setDeleting(false);
    }
  };

  if (participantsError) {
    return (
      <div role="alert" className="card tight" style={{ padding: 22 }}>
        <p className="t-body2" style={{ marginBottom: 10 }}>{participantsError}</p>
        <Button onClick={() => { setParticipantsError(null); fetchParticipants(); }}>다시 시도</Button>
      </div>
    );
  }

  if (participants === null) {
    return (
      <div className="card tight" style={{ padding: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>필수 참석자</div>
        {[...Array(3)].map((_, i) => (
          <span key={i} className="skeleton" style={{ display: "block", height: 40, borderRadius: 8, marginBottom: 6 }} />
        ))}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="card tight" style={{ padding: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>필수 참석자</div>
        <p className="t-body2">아직 참여자가 없어요.</p>
      </div>
    );
  }

  const requiredCount = participants.filter((p) => p.isRequired).length;

  return (
    <div className="card tight" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>필수 참석자</div>
        {requiredCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-accent)" }}>{requiredCount}명 지정됨</span>
        )}
      </div>
      <p className="t-cap" style={{ marginBottom: 10, color: "var(--color-text-2)" }}>
        필수 지정 시 해당 참여자가 가능한 시간 위주로 추천돼요.
      </p>
      {toggleError && <p role="alert" className="t-cap" style={{ color: "var(--color-error)", marginBottom: 10 }}>{toggleError}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {participants.map((p) => (
          <div
            key={p.participantId}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: p.isRequired ? "var(--color-accent-soft, rgba(255,107,107,0.08))" : "var(--color-bg)",
              border: p.isRequired ? "1px solid var(--color-accent)" : "1px solid var(--color-line)",
              transition: "background 160ms, border-color 160ms",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--color-text)" }}>
                {p.guestName}
              </div>
              <div className="t-cap" style={{ marginTop: 1 }}>
                {p.hasResponded ? "응답 완료" : "미응답"}
                {p.participantType === "MEMBER" && " · 회원"}
              </div>
            </div>
            <button
              type="button"
              disabled={toggling === p.participantId}
              onClick={() => handleToggle(p)}
              style={{
                height: 28, padding: "0 10px",
                borderRadius: 999, border: 0,
                background: p.isRequired ? "var(--color-accent)" : "var(--color-line)",
                color: p.isRequired ? "#fff" : "var(--color-text-2)",
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                cursor: toggling === p.participantId ? "default" : "pointer",
                opacity: toggling === p.participantId ? 0.5 : 1,
                transition: "background 160ms, color 160ms",
                whiteSpace: "nowrap" as const,
              }}
            >
              {p.isRequired ? "필수 해제" : "필수 지정"}
            </button>
            <button
              type="button"
              disabled={toggling !== null || deleting}
              onClick={() => { setDeleteError(null); setDeleteTarget(p); }}
              style={{ height: 28, padding: "0 8px", borderRadius: 999, border: "1px solid var(--color-line)", background: "#fff", color: "var(--color-error)", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="participant-delete-title" onClick={() => !deleting && setDeleteTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(event) => event.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 360 }}>
            <h3 id="participant-delete-title" className="t-h3">‘{deleteTarget.guestName}’ 참여자를 삭제할까요?</h3>
            <p className="t-body2" style={{ marginTop: 8 }}>작성한 응답도 함께 삭제되며 되돌릴 수 없어요.</p>
            {deleteError && <p role="alert" className="t-cap" style={{ color: "var(--color-error)", marginTop: 10 }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <Button block secondary disabled={deleting} onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button block danger disabled={deleting} onClick={handleDelete}>{deleting ? "삭제 중…" : "삭제"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   추천 결과 탭
══════════════════════════════════════════════════════ */
function RecommendationCalendar({ meeting, recs, selected, onSelect }: {
  meeting: MeetingDetail;
  recs: ApiRec[];
  selected: number;
  onSelect: (rank: number) => void;
}) {
  const dates = useMemo(() => {
    const result: string[] = [];
    const cursor = new Date(`${meeting.startDate}T12:00:00Z`);
    const end = new Date(`${meeting.endDate}T12:00:00Z`);
    while (cursor <= end) {
      result.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }, [meeting.startDate, meeting.endDate]);
  const recsByDate = useMemo(() => {
    const map = new Map<string, ApiRec[]>();
    recs.forEach((rec) => {
      const key = formatInTimeZone(rec.startAt, TZ, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), rec].sort((a, b) => a.rank - b.rank));
    });
    return map;
  }, [recs]);
  const leading = dates.length > 0 ? new Date(`${dates[0]}T12:00:00Z`).getUTCDay() : 0;

  return (
    <div className="card recommendation-calendar" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>추천 순위 달력</h2>
          <p className="t-cap" style={{ marginTop: 5 }}>순위가 있는 날짜를 누르면 상세 시간이 바뀌어요.</p>
        </div>
        <span className="pill ok">TOP {recs.length}</span>
      </div>
      <div className="recommendation-calendar-grid recommendation-calendar-weekdays">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="recommendation-calendar-grid">
        {Array.from({ length: leading }).map((_, index) => <span key={`blank-${index}`} />)}
        {dates.map((date) => {
          const dayRecs = recsByDate.get(date) ?? [];
          const [, month, day] = date.split("-").map(Number);
          const active = dayRecs.some((rec) => rec.rank === selected);
          return (
            <button
              key={date}
              type="button"
              disabled={dayRecs.length === 0}
              onClick={() => dayRecs[0] && onSelect(dayRecs[0].rank)}
              className={`recommendation-calendar-day${active ? " active" : ""}`}
              aria-label={`${month}월 ${day}일${dayRecs.length ? ` 추천 ${dayRecs.map((rec) => `${rec.rank}순위`).join(", ")}` : " 추천 없음"}`}
            >
              <span className="recommendation-calendar-date">{day === 1 || date === dates[0] ? `${month}.${day}` : day}</span>
              <span className="recommendation-calendar-ranks">
                {dayRecs.slice(0, 2).map((rec) => <span key={rec.rank} className={`recommendation-rank rank-${rec.rank}`}>{rec.rank}위</span>)}
                {dayRecs.length > 2 && <span className="recommendation-more">+{dayRecs.length - 2}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationsTab({
  recs,
  meeting,
  meetingId,
  voteDetails,
  voteDetailsError,
  error,
  onRetry,
  onVoteDetailsRetry,
  onConfirmed,
  onRecommendationsChanged,
  onParticipantsChanged,
}: {
  recs: ApiRec[] | null;
  meeting: MeetingDetail | null;
  meetingId: number;
  voteDetails: VoteDetailsResponse | null;
  voteDetailsError: boolean;
  error: boolean;
  onRetry: () => void;
  onVoteDetailsRetry: () => void;
  onConfirmed: () => void;
  onRecommendationsChanged: () => void;
  onParticipantsChanged: () => void;
}) {
  const [selected, setSelected] = useState(1);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const router = useRouter();

  if (error) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <p role="alert" className="t-body2" style={{ marginBottom: 14 }}>추천 결과를 불러오지 못했어요.</p>
        <Button onClick={onRetry}>다시 시도</Button>
      </div>
    );
  }

  if (recs === null) {
    return <div className="card skeleton" style={{ height: 240 }} aria-label="추천 결과 불러오는 중" />;
  }

  if (recs.length === 0) {
    return (
      <div className="recommendations-grid">
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>
            아직 추천 결과가 없어요
          </h2>
          <p className="t-body2">참여자 응답이 모이면 자동으로 계산돼요.</p>
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <RequiredParticipantsPanel
            meetingId={meetingId}
            onRecommendationsChanged={onRecommendationsChanged}
            onParticipantsChanged={onParticipantsChanged}
          />
        </aside>
      </div>
    );
  }

  const rec = recs.find((r) => r.rank === selected) ?? recs[0];
  const recommendationStatuses = voteDetails?.recommendations.find((item) => item.recommendationId === rec.recommendationId)?.participantStatuses ?? [];
  const handleConfirmRecommendation = async () => {
    if (confirming) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmMeeting(meetingId, rec.recommendationId);
      onConfirmed();
      router.push(`/meetings/${meetingId}/confirmed`);
    } catch (e) {
      setConfirmError(e instanceof ApiError ? e.message : "확정 중 오류가 생겼어요.");
      setConfirming(false);
    }
  };

  return (
    <div>
      <div className="recommendation-view-toggle" role="tablist" aria-label="추천 결과 보기 방식">
        <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")}>목록</button>
        <button type="button" role="tab" aria-selected={view === "calendar"} className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>달력</button>
      </div>
      <div className="recommendations-grid">
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {view === "calendar" && meeting ? (
          <>
            <RecommendationCalendar meeting={meeting} recs={recs} selected={selected} onSelect={setSelected} />
            <div className="card recommendation-primary-action" style={{ padding: 16 }}>
              <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>{rec.rank}순위 선택</div>
              <div style={{ fontSize: 15, fontWeight: 800, margin: "4px 0 12px" }}>
                {formatInTimeZone(rec.startAt, TZ, "M.d (EEE)", { locale: ko })} {fmtTime(rec.startAt)} – {fmtTime(rec.endAt)}
              </div>
              <Button block primary disabled={confirming} onClick={handleConfirmRecommendation}>
                {confirming ? "확정 중…" : "이 시간으로 확정"}
              </Button>
            </div>
          </>
        ) : (
          <>
        {/* 히어로 카드 */}
        <div className="card emphasis" style={{ position: "relative", display: "flex", gap: 28, padding: 32 }}>
          <span style={{
            position: "absolute", top: -12, left: 24,
            background: "var(--color-primary)", color: "#fff",
            fontSize: 12, fontWeight: 800, padding: "5px 12px",
            borderRadius: 999, letterSpacing: "-0.005em",
          }}>
            {rec.rank}순위{rec.rank === 1 ? " · 가장 잘 맞는 시간" : ""}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-body2">{fmtDateLabel(rec.startAt)}</div>
            <h2 style={{ margin: "6px 0 0", fontSize: 36, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.15 }}>
              {fmtTime(rec.startAt)} – {fmtTime(rec.endAt)}
            </h2>
            <div style={{ marginTop: 18, fontSize: 16, lineHeight: 1.6, letterSpacing: "-0.015em" }}>
              이 시간엔{" "}
              <b style={{ color: "var(--color-primary)" }}>{rec.availableCount}명이 가능</b>
              {rec.maybeCount > 0 && <>, <b style={{ color: "var(--color-maybe-text)" }}>{rec.maybeCount}명은 애매</b></>}
              {rec.unavailableCount > 0 && <>, <b style={{ color: "var(--color-text-muted)" }}>{rec.unavailableCount}명은 불가</b></>}
              <span style={{ color: "var(--color-text-2)" }}>예요.</span>
            </div>
            <div style={{ marginTop: 14 }}>
              {rec.requiredParticipantSatisfied ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", fontSize: 13, fontWeight: 700 }}>
                  <Check size={14} color="var(--color-primary)" stroke={2.5} /> 필수 참석자 모두 가능
                </span>
              ) : (
                <span style={{ display: "inline-flex", padding: "8px 12px", borderRadius: 10, background: "var(--color-maybe-soft)", color: "var(--color-maybe-text)", fontSize: 13, fontWeight: 700 }}>
                  필수 참석자 일부 참여 불가
                </span>
              )}
            </div>
            <div className="recommendation-primary-action" style={{ marginTop: 16 }}>
              <Button block primary disabled={confirming} onClick={handleConfirmRecommendation}>
                {confirming ? "확정 중…" : "이 시간으로 확정"}
              </Button>
            </div>
          </div>
        </div>

        {voteDetails && (
          <div className="card tight" style={{ padding: 20 }}>
            <h3 className="t-h3">이 시간의 참여자</h3>
            <ParticipantStatusDetails statuses={recommendationStatuses} details={voteDetails} />
          </div>
        )}
        {voteDetailsError && (
          <div className="card tight" style={{ padding: 20 }}>
            <p role="alert" className="t-body2" style={{ marginBottom: 10 }}>참여자 상세를 불러오지 못했어요.</p>
            <Button onClick={onVoteDetailsRetry}>다시 시도</Button>
          </div>
        )}

        {/* 순위 목록 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>다른 추천 시간</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recs.map((r) => (
              <button
                key={r.rank}
                type="button"
                onClick={() => setSelected(r.rank)}
                style={{
                  width: "100%", textAlign: "left",
                  background: selected === r.rank ? "var(--color-primary-soft)" : "var(--color-surface)",
                  border: selected === r.rank ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                  borderRadius: 16, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  fontFamily: "inherit", cursor: "pointer",
                  transition: "background 160ms, border-color 160ms",
                }}
              >
                <span style={{
                  background: r.rank === 1 ? "var(--color-primary)" : "var(--color-bg-2)",
                  color: r.rank === 1 ? "#fff" : "var(--color-text-2)",
                  fontSize: 12, fontWeight: 800, padding: "5px 10px",
                  borderRadius: 999, flex: "none",
                }}>{r.rank}순위</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                    {formatInTimeZone(r.startAt, TZ, "M.d (EEE)", { locale: ko })} {fmtTime(r.startAt)} – {fmtTime(r.endAt)}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 3, color: "var(--color-text-2)" }}>
                    <b style={{ color: "var(--color-primary)" }}>가능 {r.availableCount}</b>
                    {" · "}<span style={{ color: "var(--color-maybe-text)" }}>애매 {r.maybeCount}</span>
                    {" · "}<span style={{ color: "var(--color-text-muted)" }}>불가 {r.unavailableCount}</span>
                  </div>
                </div>
                {r.requiredParticipantSatisfied && <span className="pill ok" style={{ height: 24, padding: "0 10px", fontSize: 11, flex: "none" }}>필수 OK</span>}
                <span style={{ color: selected === r.rank ? "var(--color-primary)" : "var(--color-text-muted)", fontSize: 18, transition: "color 160ms, transform 160ms", transform: selected === r.rank ? "translateX(2px)" : "none" }}>›</span>
              </button>
            ))}
          </div>
        </div>
          </>
        )}

        {view === "calendar" && voteDetails && (
          <div className="card tight" style={{ padding: 20 }}>
            <h3 className="t-h3">{rec.rank}순위 참여자</h3>
            <ParticipantStatusDetails statuses={recommendationStatuses} details={voteDetails} />
          </div>
        )}
      </div>

      {/* RIGHT — 확정 패널 */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card tight recommendation-confirm-panel" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", left: 0, top: 18, bottom: 18, width: 3, borderRadius: 3, background: "var(--color-primary)" }} aria-hidden="true" />
          <div className="t-cap" style={{ fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>이 시간으로</div>
          <h3 style={{ margin: "4px 0 2px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em" }}>
            {fmtTime(rec.startAt)} – {fmtTime(rec.endAt)}
          </h3>
          <p className="t-cap" style={{ marginBottom: 14 }}>{fmtDateLabel(rec.startAt)}</p>
          {confirmError && <p style={{ fontSize: 13, color: "var(--color-accent)", margin: "0 0 8px" }}>{confirmError}</p>}
          <Button
            block primary
            disabled={confirming}
            leftIcon={<Check size={18} color="#fff" stroke={2.5} />}
            onClick={handleConfirmRecommendation}
          >
            {confirming ? "확정 중…" : "이 시간으로 확정"}
          </Button>
        </div>

        <RequiredParticipantsPanel
          meetingId={meetingId}
          onRecommendationsChanged={onRecommendationsChanged}
          onParticipantsChanged={onParticipantsChanged}
        />
      </aside>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════ */
export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mid = Number(id);
  const [tab, setTab] = useState<Tab>(() => searchParams.get("tab") === "recommendations" ? "recommendations" : "aggregate");
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [recs, setRecs] = useState<ApiRec[] | null>(null);
  const [recsError, setRecsError] = useState(false);
  // null = 아직 로딩 중(빈 배열 = 슬롯 없음과 구분). aggError = fetch 실패.
  const [agg, setAgg] = useState<SlotAggregate[] | null>(null);
  const [aggError, setAggError] = useState(false);
  const [voteDetails, setVoteDetails] = useState<VoteDetailsResponse | null>(null);
  const [voteDetailsError, setVoteDetailsError] = useState(false);

  const fetchMeeting = useCallback(() => {
    getMeeting(mid)
      .then(setMeeting)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setMeetingError(getApiErrorMessage(e, "모임 정보를 불러오지 못했어요."));
      });
  }, [mid, router]);

  const fetchRecommendations = useCallback(() => {
    getRecommendations(mid)
      .then((res) => setRecs(res.recommendations))
      .catch(() => setRecsError(true));
  }, [mid]);

  const loadRecommendations = useCallback(() => {
    setRecsError(false);
    setRecs(null);
    fetchRecommendations();
  }, [fetchRecommendations]);

  // 조회만(상태 setter 는 .then/.catch 안 — effect 에서 동기 setState 회피).
  const fetchAggregate = useCallback(() => {
    getAggregate(mid)
      .then((res) => setAgg(res.slots))
      .catch(() => setAggError(true));
  }, [mid]);

  // 재시도·수정 후: 로딩 상태로 되돌린 뒤 다시 조회.
  const loadAggregate = useCallback(() => {
    setAggError(false);
    setAgg(null);
    fetchAggregate();
  }, [fetchAggregate]);

  const fetchVoteDetails = useCallback(() => {
    getVoteDetails(mid).then(setVoteDetails).catch(() => setVoteDetailsError(true));
  }, [mid]);

  const loadVoteDetails = useCallback(() => {
    setVoteDetailsError(false);
    setVoteDetails(null);
    fetchVoteDetails();
  }, [fetchVoteDetails]);

  const refreshParticipantData = useCallback(() => {
    fetchMeeting();
    loadAggregate();
    loadRecommendations();
    loadVoteDetails();
  }, [fetchMeeting, loadAggregate, loadRecommendations, loadVoteDetails]);

  useEffect(() => {
    if (!getToken()) { router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`); return; }
    fetchMeeting();
    fetchRecommendations();
    // 초기값이 이미 null(로딩) 이라 reset 없이 조회만 — effect 내 동기 setState 회피.
    fetchAggregate();
    fetchVoteDetails();
  }, [router, fetchMeeting, fetchAggregate, fetchRecommendations, fetchVoteDetails]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)" }}>
      <AppHeader />

      <main className="dashboard-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 96px" }}>
        {meetingError && (
          <div role="alert" className="card" style={{ textAlign: "center", marginBottom: 18 }}>
            <p className="t-body2" style={{ marginBottom: 12 }}>{meetingError}</p>
            <Button onClick={() => { setMeetingError(null); fetchMeeting(); }}>다시 시도</Button>
          </div>
        )}
        {/* 브레드크럼 */}
        <div className="dashboard-breadcrumb" style={{ fontSize: 13, color: "var(--color-text-2)", letterSpacing: "-0.01em", marginBottom: 18 }}>
          <Link href="/meetings" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>내 모임</Link>
          <span style={{ margin: "0 6px", color: "var(--color-text-muted)" }}>›</span>
          <span style={{ color: "var(--color-text)", fontWeight: 700 }}>{meeting?.title ?? "–"}</span>
        </div>

        <MeetingHero
          meeting={meeting}
          onUpdated={(m) => { setMeeting(m); loadAggregate(); }}
        />
        <PageTabs tab={tab} setTab={setTab} />

        {tab === "aggregate"
          ? <AggregateTab slots={agg} meeting={meeting} voteDetails={voteDetails} voteDetailsError={voteDetailsError} error={aggError} onRetry={loadAggregate} onVoteDetailsRetry={loadVoteDetails} />
          : (
              <RecommendationsTab
                recs={recs}
                meeting={meeting}
                meetingId={mid}
                voteDetails={voteDetails}
                voteDetailsError={voteDetailsError}
                error={recsError}
                onRetry={loadRecommendations}
                onVoteDetailsRetry={loadVoteDetails}
                onConfirmed={() => setRecs([])}
                onRecommendationsChanged={loadRecommendations}
                onParticipantsChanged={refreshParticipantData}
              />
            )}
      </main>
    </div>
  );
}
