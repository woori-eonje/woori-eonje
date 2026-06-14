"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { Logo, Button } from "@/components/primitives";
import { ParticipantRow } from "@/components/meeting/ParticipantRow";
import { Check, Clock, PlusCircle, Copy, Share } from "@/components/icons";
import { getMeeting, getRecommendations, confirmMeeting } from "@/lib/meetings";
import { ApiError, getToken } from "@/lib/api";
import type { MeetingDetail, Recommendation as ApiRec } from "@whenwe/types";

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

/* ── 상수 ── */
const DAYS = [
  { id: "6.4",  label: "6.4",  weekday: "목" },
  { id: "6.5",  label: "6.5",  weekday: "금" },
  { id: "6.6",  label: "6.6",  weekday: "토" },
  { id: "6.7",  label: "6.7",  weekday: "일" },
  { id: "6.8",  label: "6.8",  weekday: "월" },
  { id: "6.9",  label: "6.9",  weekday: "화" },
  { id: "6.10", label: "6.10", weekday: "수" },
];
const HOURS = ["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00"];
const TOTAL = 6;


/* ── 히트맵 데이터 ── */
function buildAgg() {
  const agg: Record<string, { ok: number; m: number }> = {};
  for (const d of DAYS) for (const h of HOURS) agg[`${d.id}_${h}`] = { ok: 0, m: 0 };
  const s = (d: string, h: string, ok: number, m: number) => { agg[`${d}_${h}`] = { ok, m }; };
  s("6.4","19:00",3,1); s("6.4","19:30",4,1); s("6.4","20:00",4,0); s("6.4","20:30",3,1); s("6.4","21:00",2,1);
  s("6.5","19:00",2,1); s("6.5","19:30",3,1); s("6.5","20:00",3,2); s("6.5","21:00",2,0);
  s("6.6","18:30",4,1); s("6.6","19:00",5,1); s("6.6","19:30",5,1); s("6.6","20:00",5,0); s("6.6","20:30",4,1); s("6.6","21:00",3,1);
  s("6.7","18:00",2,0); s("6.7","19:00",3,1); s("6.7","19:30",4,0); s("6.7","20:00",4,1); s("6.7","21:00",2,1);
  s("6.8","20:00",4,1); s("6.8","20:30",4,0); s("6.8","21:00",3,1); s("6.8","21:30",2,1);
  s("6.9","19:00",2,1); s("6.9","20:00",3,1); s("6.9","20:30",3,0);
  s("6.10","19:30",3,0); s("6.10","20:00",4,1); s("6.10","20:30",3,1);
  return agg;
}

function cellBg(ok: number) {
  if (ok >= 5) return { bg: "#1A9562",                color: "#fff" };
  if (ok === 4) return { bg: "rgba(26,149,98,0.45)",  color: "#fff" };
  if (ok === 3) return { bg: "rgba(26,149,98,0.22)",  color: "var(--color-text)" };
  if (ok === 2) return { bg: "rgba(183,211,255,0.55)",color: "var(--color-text)" };
  if (ok === 1) return { bg: "rgba(214,231,255,0.55)",color: "var(--color-text-2)" };
  return { bg: "transparent", color: "var(--color-text-2)" };
}

type Tab = "aggregate" | "recommendations";

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
    <header style={{
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
      <nav style={{ display: "flex", gap: 4, marginLeft: 24 }}>
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
function MeetingHero({ meeting }: { meeting: MeetingDetail | null }) {
  const [copied, setCopied] = useState(false);
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
    <div style={{
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
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--color-primary)" }}>
          {meeting ? CATEGORY_LABEL[meeting.category] : <span className="skeleton" style={{ display: "inline-block", width: 60, height: 14, borderRadius: 4 }} />}
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.25 }}>
          {meeting?.title ?? <span className="skeleton" style={{ display: "inline-block", width: 160, height: 26, borderRadius: 8 }} />}
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--color-text-2)", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
          {meeting?.description ?? ""}
        </p>
        <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" as const }}>
          {[
            { label: "조율 기간", value: dateRange },
            { label: "예상 소요", value: meeting ? `${meeting.durationHours}시간` : "–" },
            { label: "참여자",    value: meeting ? `${meeting.participantCount}명` : "–", color: "var(--color-primary)" },
            { label: "마감까지", value: meeting ? fmtDeadlineLeft(meeting.responseDeadline) : "–" },
          ].map(({ label, value, color }) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, fontSize: 13, color: "var(--color-text-2)", whiteSpace: "nowrap" as const }}>
              {label} <b style={{ color: color ?? "var(--color-text)", fontWeight: 700 }}>{value}</b>
            </span>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const, flex: "none", position: "relative", zIndex: 1 }}>
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
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   탭 스위처
══════════════════════════════════════════════════════ */
function PageTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div style={{
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
function AggregateTab() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const agg = useMemo(() => buildAgg(), []);
  const [picked, setPicked] = useState<string | null>("6.6_20:00");

  const pickedData = picked ? agg[picked] : null;
  const [pickedDay, pickedHour] = picked ? picked.split("_") : ["", ""];
  const pickedX = pickedData ? TOTAL - pickedData.ok - pickedData.m : 0;

  const PARTICIPANTS = [
    { name: "소미", req: true }, { name: "지현", req: true },
    { name: "민수", req: false }, { name: "유나", req: false },
    { name: "태오", req: false }, { name: "하린", req: false },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 24, alignItems: "start" }}>
      {/* 히트맵 */}
      <div className="card" style={{ padding: 28, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap" as const, gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.3 }}>언제 가장 많이 모일 수 있을까요?</h2>
            <p className="t-body2" style={{ marginTop: 6 }}>색이 진할수록 더 많은 사람이 가능해요. 셀을 누르면 누가 가능한지 보여드릴게요.</p>
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

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 5, fontFamily: "inherit", minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ width: 52 }} />
                {DAYS.map((d) => (
                  <th key={d.id} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", padding: "4px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)" }}>{d.weekday}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>{d.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h}>
                  <td style={{ fontSize: 11, color: "var(--color-text-2)", textAlign: "right", paddingRight: 8, verticalAlign: "middle", whiteSpace: "nowrap" as const }}>{h}</td>
                  {DAYS.map((d) => {
                    const key = `${d.id}_${h}`;
                    const data = agg[key];
                    const isPicked = picked === key;
                    const { bg, color } = cellBg(data.ok);
                    return (
                      <td key={key} style={{ padding: 0 }}>
                        <button
                          type="button"
                          onClick={() => setPicked(key)}
                          aria-label={`${d.weekday} ${d.label} ${h} 가능 ${data.ok}명`}
                          style={{
                            width: "100%", height: 42,
                            border: data.m > 0 ? "1px dashed var(--color-maybe)" : `1px solid ${data.ok > 0 ? "transparent" : "var(--color-line)"}`,
                            padding: 0, cursor: "pointer",
                            borderRadius: 8,
                            fontSize: 13, fontWeight: 700,
                            background: bg, color,
                            outline: isPicked ? "2px solid var(--color-primary)" : "none",
                            outlineOffset: 1,
                            transition: "outline 80ms, box-shadow 120ms",
                          }}
                        >
                          {data.ok > 0 ? data.ok : ""}
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
          {picked && pickedData ? (
            <>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, letterSpacing: "-0.025em" }}>
                {pickedDay} ({DAYS.find((d) => d.id === pickedDay)?.weekday}) {pickedHour}
              </h3>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 14, flexWrap: "wrap" as const }}>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 22, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>{pickedData.ok}</b>
                  <span style={{ fontSize: 12, color: "var(--color-primary)" }}>가능</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-maybe-text)" }}>{pickedData.m}</b>
                  <span style={{ fontSize: 12, color: "var(--color-maybe-text)" }}>애매</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-muted)" }}>{pickedX}</b>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>응답 대기</span>
                </span>
              </div>
              <div className="divider" />
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "14px 0 8px" }}>참여자별 상태</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {PARTICIPANTS.map((p, i) => {
                  const idx = (pickedDay.charCodeAt(0) + (pickedHour?.charCodeAt(0) ?? 0) + i) % 5;
                  const status = idx < 3 ? "available" : idx === 3 ? "maybe" : "unavail";
                  return <ParticipantRow key={p.name} name={p.name} status={status as "available"|"maybe"|"unavail"} required={p.req} />;
                })}
              </div>
            </>
          ) : (
            <p className="t-body2">히트맵에서 시간을 누르면 상세 정보가 보여요.</p>
          )}
        </div>

        <div className="card tight" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: -20, right: -16, width: 70, height: 70, borderRadius: 999, background: "var(--color-baby-blue)", opacity: 0.55 }} aria-hidden="true" />
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>응답 현황</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.03em" }}>5</span>
            <span className="t-body2">/ 6명</span>
          </div>
          <div style={{ height: 8, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "83%", height: "100%", background: "var(--color-primary)", borderRadius: 999 }} />
          </div>
          <p className="t-cap" style={{ marginTop: 10 }}>마감 5.30 (금) 23:59 · 남은 시간 2일 6시간</p>
        </div>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   추천 결과 탭
══════════════════════════════════════════════════════ */
function RecommendationsTab({ recs, meetingId, onConfirmed }: {
  recs: ApiRec[];
  meetingId: number;
  onConfirmed: () => void;
}) {
  const [selected, setSelected] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const router = useRouter();

  if (recs.length === 0) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <p className="t-body2">아직 추천 결과가 없어요. 참여자 응답 후 자동으로 계산돼요.</p>
      </div>
    );
  }

  const rec = recs.find((r) => r.rank === selected) ?? recs[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 24, alignItems: "start" }}>
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
          </div>
        </div>

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
      </div>

      {/* RIGHT — 확정 패널 */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card tight" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
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
            onClick={async () => {
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
            }}
          >
            {confirming ? "확정 중…" : "이 시간으로 확정"}
          </Button>
        </div>

        <div className="card tight" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: -20, right: -16, width: 70, height: 70, borderRadius: 999, background: "var(--color-lavender)", opacity: 0.5 }} aria-hidden="true" />
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10 }}>모임 정보</div>
          <p className="t-cap" style={{ marginBottom: 14, color: "var(--color-text-2)" }}>가용 슬롯이 있어야 추천이 계산돼요.</p>
        </div>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════ */
export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("aggregate");
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [recs, setRecs] = useState<ApiRec[]>([]);

  useEffect(() => {
    if (!getToken()) { router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`); return; }
    const mid = Number(id);
    getMeeting(mid)
      .then(setMeeting)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "UNAUTHENTICATED") router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
      });
    getRecommendations(mid)
      .then((res) => setRecs(res.recommendations))
      .catch(() => {});
  }, [id, router]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)" }}>
      <AppHeader />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 96px" }}>
        {/* 브레드크럼 */}
        <div style={{ fontSize: 13, color: "var(--color-text-2)", letterSpacing: "-0.01em", marginBottom: 18 }}>
          <Link href="/meetings" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>내 모임</Link>
          <span style={{ margin: "0 6px", color: "var(--color-text-muted)" }}>›</span>
          <span style={{ color: "var(--color-text)", fontWeight: 700 }}>{meeting?.title ?? "–"}</span>
        </div>

        <MeetingHero meeting={meeting} />
        <PageTabs tab={tab} setTab={setTab} />

        {tab === "aggregate"
          ? <AggregateTab />
          : <RecommendationsTab recs={recs} meetingId={Number(id)} onConfirmed={() => setRecs([])} />}
      </main>
    </div>
  );
}
