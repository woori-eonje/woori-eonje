"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { DatePicker } from "@/components/ui/date-picker";
import { Users, BookOpen, Briefcase, Copy, Share } from "@/components/icons";
import { createMeeting } from "@/lib/meetings";
import { getToken } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { MeetingCategory } from "@whenwe/types";

const STEPS = [
  { id: 1, label: "모임 정보",  q: "어떤 모임인가요?" },
  { id: 2, label: "기간",       q: "언제 사이에서 고를까요?" },
  { id: 3, label: "소요 시간",  q: "얼마나 만날 예정인가요?" },
  { id: 4, label: "초대",       q: "초대 링크를 공유해요" },
];

function StepBar({ current }: { current: number }) {
  const s = STEPS.find((x) => x.id === current)!;
  const pct = (current / STEPS.length) * 100;
  return (
    <div style={{ padding: "12px 20px 14px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>
            Step {current} / {STEPS.length}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em", whiteSpace: "nowrap" as const }}>
            {s.label}
          </span>
        </div>
        <span className="t-cap">{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 4, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "var(--color-primary)", borderRadius: 999,
          transition: "width 320ms cubic-bezier(.22,1,.36,1)",
        }} />
      </div>
    </div>
  );
}

function Section({ q, helper, sub, children }: {
  q: string; helper?: string; sub?: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sub ? 12 : 16 }}>
      <div>
        <h2 style={{
          margin: 0,
          fontSize: sub ? 16 : 24, fontWeight: sub ? 700 : 800,
          letterSpacing: sub ? "-0.02em" : "-0.035em",
          lineHeight: 1.3,
          color: sub ? "var(--color-text-2)" : "var(--color-text)",
        }}>
          {q}
        </h2>
        {helper && <p className="t-body2" style={{ marginTop: 6 }}>{helper}</p>}
      </div>
      {children}
    </div>
  );
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
}
function OptionCard({ icon, title, subtitle, active, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: active ? "var(--color-primary-soft)" : "var(--color-surface)",
        border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
        borderRadius: 14, padding: "11px 14px",
        display: "flex", alignItems: "center", gap: 12,
        fontFamily: "inherit", cursor: "pointer",
        transition: "background 160ms, border-color 160ms",
      }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: 10, flex: "none",
        background: active ? "#fff" : "var(--color-bg)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: active ? "var(--color-primary)" : "var(--color-text)",
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em", color: active ? "var(--color-primary)" : "var(--color-text)" }}>
          {title}
        </span>
        {subtitle && <span style={{ display: "block", fontSize: 12, color: "var(--color-text-2)", marginTop: 1 }}>{subtitle}</span>}
      </span>
      <span style={{
        width: 18, height: 18, borderRadius: 999,
        border: active ? "0" : "1.5px solid var(--color-line-strong)",
        background: active ? "var(--color-primary)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 10, fontWeight: 800,
      }}>
        {active ? "✓" : ""}
      </span>
    </button>
  );
}

/* ── Duration quick-select ── */
const DURATIONS = ["1시간", "2시간", "3시간", "4시간", "5시간+"];
const TIME_RANGES = [
  { id: "evening", label: "저녁",      sub: "18:00 – 23:00" },
  { id: "daytime", label: "낮",        sub: "09:00 – 18:00" },
  { id: "allday",  label: "하루 전체", sub: "09:00 – 22:00" },
  { id: "custom",  label: "직접 설정", sub: "시작 ~ 종료 입력" },
];

const KIND_TO_CAT: Record<string, MeetingCategory> = {
  friend: "FRIEND", study: "STUDY", business: "BUSINESS",
};
const DURATION_H: Record<string, number> = {
  "1시간": 1, "2시간": 2, "3시간": 3, "4시간": 4, "5시간+": 5,
};
const RANGE_TIME: Record<string, { s: string; e: string }> = {
  "evening": { s: "18:00", e: "23:00" },
  "daytime": { s: "09:00", e: "18:00" },
  "allday":  { s: "09:00", e: "22:00" },
  "custom":  { s: "09:00", e: "23:00" },
};
function toYMD(d: Date) { return d.toLocaleDateString("sv"); }
function toDeadlineISO(d: Date) { return `${toYMD(d)}T23:59:00+09:00`; }

// 범위(from~to, 양끝 포함)를 YMD 문자열 목록으로. 특정 날짜 칩 그리드용.
function datesInRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(from); cur.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  while (cur.getTime() <= end.getTime()) {
    out.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
function ymdLabel(ymd: string): { md: string; dow: string } {
  const d = new Date(`${ymd}T00:00:00`);
  return { md: `${d.getMonth() + 1}.${d.getDate()}`, dow: WEEKDAY_KO[d.getDay()] };
}

interface WizardData {
  name: string; desc: string; kind: string;
  from?: Date; to?: Date; due?: Date;
  duration: string; range: string;
  customStart: string; customEnd: string;
  /** 특정 날짜만 고르기 모드 */
  useSpecificDates: boolean;
  /** 선택된 특정 날짜(YMD) — useSpecificDates 일 때만 의미 */
  selectedDates: string[];
}

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    name: "", desc: "", kind: "",
    from: undefined, to: undefined, due: undefined,
    duration: "", range: "evening",
    customStart: "09:00", customEnd: "22:00",
    useSpecificDates: false, selectedDates: [],
  });
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
  }, [router]);

  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  const meetingHref = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return isMobile
      ? `/meetings/${meetingId}/status`
      : `/meetings/${meetingId}/dashboard`;
  };

  const handleNext = async () => {
    if (step !== 3) { setStep((s) => Math.min(s + 1, STEPS.length)); return; }
    if (meetingId !== null) { setStep(4); return; }  // 이미 생성된 경우 재사용
    setCreating(true);
    setCreateError(null);
    try {
      const tr = data.range === "custom"
        ? { s: data.customStart, e: data.customEnd }
        : (RANGE_TIME[data.range] ?? RANGE_TIME.evening);
      const useDates = data.useSpecificDates && data.selectedDates.length > 0;
      const res = await createMeeting({
        title: data.name,
        description: data.desc || null,
        category: KIND_TO_CAT[data.kind],
        startDate: toYMD(data.from!),
        endDate: toYMD(data.to!),
        availableStartTime: tr.s,
        availableEndTime: tr.e,
        durationHours: DURATION_H[data.duration] ?? 2,
        responseDeadline: toDeadlineISO(data.due!),
        // 특정 날짜 모드면 선택한 날짜만 슬롯 생성(범위는 그대로 30일 상한·마감 기준).
        ...(useDates ? { dates: data.selectedDates } : {}),
      });
      setInviteUrl(res.inviteUrl);
      setMeetingId(res.meetingId);
      setStep(4);
    } catch (e) {
      setCreateError(getApiErrorMessage(e, "모임 생성 중 오류가 생겼어요."));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("초대 링크를 복사하지 못했어요. 다시 시도해 주세요.");
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.name,
          text: `${data.name} 가능 시간을 알려주세요.`,
          url: inviteUrl,
        });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    handleCopy();
  };

  return (
    <div className="screen">
      <TopBar
        title="새 모임 만들기"
        onBack={step === 1 ? () => router.back() : () => setStep((s) => s - 1)}
      />
      <StepBar current={step} />

      {/* Step 1 */}
      {step === 1 && (
        <>
          <div className="scroll" style={{ padding: "20px 20px 96px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Section q={STEPS[0].q} helper="이름과 한 줄 설명만 적어도 충분해요.">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>
                  모임명 <span style={{ color: "var(--color-accent)" }}>*</span>
                </label>
                <input className="input" placeholder="예) 6월 전시 모임"
                  value={data.name} onChange={(e) => set({ name: e.target.value })} maxLength={24} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>한 줄 설명</label>
                <input className="input" placeholder="6월 초에 전시 보러 갈 사람들 일정 조율"
                  value={data.desc} onChange={(e) => set({ desc: e.target.value })} maxLength={60} />
                <span className="t-cap">{data.desc.length}/60</span>
              </div>
            </Section>

            <Section q="모임 성격" sub>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: "friend",   icon: <Users size={18} color={data.kind === "friend" ? "var(--color-primary)" : "var(--color-text-2)"} stroke={1.85} />, title: "친구 모임",  sub: "전시, 모임, 가벼운 약속" },
                  { id: "study",    icon: <BookOpen size={18} color={data.kind === "study" ? "var(--color-primary)" : "var(--color-text-2)"} stroke={1.85} />, title: "스터디",     sub: "정기 / 부정기 학습 모임" },
                  { id: "business", icon: <Briefcase size={18} color={data.kind === "business" ? "var(--color-primary)" : "var(--color-text-2)"} stroke={1.85} />, title: "비즈니스",  sub: "팀 회의, 미팅" },
                ].map((t) => (
                  <OptionCard key={t.id}
                    icon={t.icon} title={t.title} subtitle={t.sub}
                    active={data.kind === t.id}
                    onClick={() => set({ kind: t.id })}
                  />
                ))}
              </div>
            </Section>
          </div>
          <div className="bottom-bar">
            <Button block primary disabled={data.name.trim().length < 2 || !data.kind} onClick={handleNext}>다음</Button>
          </div>
        </>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <>
          <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const maxEnd = data.from ? new Date(data.from.getTime() + 29 * 86400000) : undefined;
              const maxDue = data.from ? new Date(data.from.getTime() - 86400000) : undefined;
              return (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      후보 기간 시작 <span style={{ color: "var(--color-accent)" }}>*</span>
                    </label>
                    <DatePicker
                      value={data.from}
                      onChange={(d) => set({ from: d, to: undefined, due: undefined, selectedDates: [] })}
                      placeholder="시작일 선택"
                      fromDate={today}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      후보 기간 종료 <span style={{ color: "var(--color-accent)" }}>*</span>
                    </label>
                    <DatePicker
                      value={data.to}
                      onChange={(d) => set({ to: d, selectedDates: [] })}
                      placeholder="종료일 선택"
                      fromDate={data.from ? new Date(data.from.getTime() + 86400000) : today}
                      toDate={maxEnd}
                      disabled={!data.from}
                    />
                    {data.from && <div className="t-cap">최대 30일 ({data.from.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} ~ {maxEnd?.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })})</div>}
                  </div>

                  {/* 특정 날짜만 고르기 (선택) — 범위 안에서 후보 날짜를 직접 고름 */}
                  {data.from && data.to && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={data.useSpecificDates}
                          onChange={(e) => set({ useSpecificDates: e.target.checked, selectedDates: [] })}
                          style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>이 기간에서 특정 날짜만 고를게요</span>
                      </label>
                      {data.useSpecificDates && (
                        <>
                          <div className="t-cap">고른 날짜에만 후보 시간이 만들어져요. (예: 주말만)</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                            {datesInRange(data.from, data.to).map((ymd) => {
                              const on = data.selectedDates.includes(ymd);
                              const { md, dow } = ymdLabel(ymd);
                              return (
                                <button
                                  key={ymd}
                                  type="button"
                                  onClick={() => set({
                                    selectedDates: on
                                      ? data.selectedDates.filter((x) => x !== ymd)
                                      : [...data.selectedDates, ymd],
                                  })}
                                  style={{
                                    minWidth: 52, padding: "8px 10px", borderRadius: 12,
                                    fontFamily: "inherit", cursor: "pointer", textAlign: "center" as const,
                                    border: on ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                                    background: on ? "var(--color-primary-soft)" : "#fff",
                                    color: on ? "var(--color-primary)" : "var(--color-text)",
                                    transition: "all 120ms",
                                  }}
                                >
                                  <div style={{ fontSize: 10, fontWeight: 600, color: on ? "var(--color-primary)" : "var(--color-text-muted)" }}>{dow}</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 1 }}>{md}</div>
                                </button>
                              );
                            })}
                          </div>
                          {data.selectedDates.length === 0 && (
                            <div className="t-cap" style={{ color: "var(--color-accent)" }}>최소 한 날짜는 골라주세요.</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      응답 수집 마감일 <span style={{ color: "var(--color-accent)" }}>*</span>
                    </label>
                    <DatePicker
                      value={data.due}
                      onChange={(d) => set({ due: d })}
                      placeholder="마감일 선택"
                      fromDate={today}
                      toDate={maxDue}
                      disabled={!data.from}
                    />
                    {data.from && <div className="t-cap">후보 기간 시작일 전날까지 선택 가능</div>}
                  </div>
                </>
              );
            })()}
          </div>
          <div className="bottom-bar">
            <Button
              block primary
              disabled={!data.from || !data.to || !data.due || (data.useSpecificDates && data.selectedDates.length === 0)}
              onClick={handleNext}
            >다음</Button>
          </div>
        </>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <>
          <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Section q={STEPS[2].q} helper="연속으로 가능한 구간을 계산하는 데 사용해요.">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="t-body2" style={{ fontWeight: 700 }}>예상 소요 시간</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {DURATIONS.map((d) => (
                    <button key={d} onClick={() => set({ duration: d })} style={{
                      padding: "8px 14px", borderRadius: 999, fontFamily: "inherit",
                      fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em", cursor: "pointer",
                      border: data.duration === d ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                      background: data.duration === d ? "var(--color-primary-soft)" : "#fff",
                      color: data.duration === d ? "var(--color-primary)" : "var(--color-text)",
                      transition: "all 120ms",
                    }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section q="선택 가능한 시간대" sub>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TIME_RANGES.map((t) => (
                  <OptionCard key={t.id}
                    icon={null} title={t.label} subtitle={t.sub}
                    active={data.range === t.id}
                    onClick={() => set({ range: t.id })}
                  />
                ))}
                {data.range === "custom" && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", paddingLeft: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)" }}>시작</label>
                      <input
                        className="input"
                        type="time"
                        step="3600"
                        value={data.customStart}
                        onChange={(e) => {
                          const [h] = e.target.value.split(":");
                          set({ customStart: `${h}:00` });
                        }}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: "var(--color-text-muted)", paddingTop: 20 }}>–</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)" }}>종료</label>
                      <input
                        className="input"
                        type="time"
                        step="3600"
                        value={data.customEnd}
                        onChange={(e) => {
                          const [h] = e.target.value.split(":");
                          set({ customEnd: `${h}:00` });
                        }}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
          <div className="bottom-bar">
            {createError && <p style={{ fontSize: 13, color: "var(--color-accent)", textAlign: "center", margin: 0 }}>{createError}</p>}
            {shareError && <p role="alert" style={{ fontSize: 13, color: "var(--color-accent)", textAlign: "center", margin: 0 }}>{shareError}</p>}
            <Button block primary disabled={!data.duration || !data.range || creating} onClick={handleNext}>
              {creating ? "생성 중…" : "다음"}
            </Button>
          </div>
        </>
      )}

      {/* Step 4 — Invite link */}
      {step === 4 && (
        <>
          <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Section q={STEPS[3].q} helper="링크를 받은 사람은 로그인 없이 바로 참여할 수 있어요.">
              {/* Link box */}
              <div style={{
                background: "var(--color-surface)", border: "1px solid var(--color-line)",
                borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-cap">초대 링크</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {inviteUrl ?? "링크를 불러오는 중…"}
                  </div>
                </div>
                <button onClick={handleCopy} className="btn outline" style={{ height: 36, padding: "0 12px", fontSize: 13, flex: "none" }}>
                  <Copy size={14} color="var(--color-primary)" />
                  <span>{copied ? "복사됨!" : "복사"}</span>
                </button>
              </div>

              <Button block variant="secondary" leftIcon={<Share size={16} color="var(--color-primary)" />} onClick={handleShare}>
                {copied ? "링크 복사됨!" : "공유하기"}
              </Button>

              <div style={{
                background: "var(--color-primary-soft)", borderRadius: 12,
                padding: "12px 14px", fontSize: 13, lineHeight: 1.6, letterSpacing: "-0.01em",
                color: "var(--color-primary)",
              }}>
                링크를 받은 사람은 누구나 참여할 수 있어요. 단톡방에 바로 붙여넣으면 돼요.
              </div>
            </Section>

            {/* Meeting summary */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.015em" }}>{data.name || "6월 전시 모임"}</div>
              <div className="divider" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div className="t-cap">조율 기간</div><div style={{ fontSize: 13, fontWeight: 700 }}>{data.from ? data.from.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "6.1"} — {data.to ? data.to.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "6.14"}</div></div>
                <div><div className="t-cap">소요 시간</div><div style={{ fontSize: 13, fontWeight: 700 }}>{data.duration || "2시간"}</div></div>
                <div><div className="t-cap">응답 마감</div><div style={{ fontSize: 13, fontWeight: 700 }}>{data.due ? data.due.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "5.30"}</div></div>
              </div>
            </div>
          </div>
          <div className="bottom-bar">
            <Button block primary disabled={meetingId === null} onClick={() => router.push(meetingHref())}>
              {typeof window !== "undefined" && window.innerWidth < 768 ? "응답 현황 보기" : "대시보드로 이동"}
            </Button>
            <Button block variant="ghost" onClick={() => router.push("/meetings")}>
              내 모임 목록으로
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
