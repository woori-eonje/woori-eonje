"use client";

import { useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { DateTab } from "@/components/time-select/DateTab";
import { TimeSlot } from "@/components/time-select/TimeSlot";
import { ModeToggle } from "@/components/time-select/ModeToggle";
import type { SlotState, Picks } from "@/types/meeting";

const DATES = [
  { id: "6.4", label: "6.4", weekday: "목" },
  { id: "6.5", label: "6.5", weekday: "금" },
  { id: "6.6", label: "6.6", weekday: "토" },
  { id: "6.7", label: "6.7", weekday: "일" },
  { id: "6.8", label: "6.8", weekday: "월" },
  { id: "6.9", label: "6.9", weekday: "화" },
];
const TIMES = [
  "오후 6:00","오후 6:30","오후 7:00","오후 7:30","오후 8:00",
  "오후 8:30","오후 9:00","오후 9:30","오후 10:00","오후 10:30",
];

export default function TimeSelectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [activeDate, setActiveDate] = useState("6.6");
  const [mode, setMode] = useState<SlotState>("available");
  const [picks, setPicks] = useState<Picks>({
    "6.6": { "오후 7:00": "available", "오후 7:30": "available", "오후 8:00": "available", "오후 8:30": "maybe" },
    "6.5": { "오후 9:00": "available" },
  });

  const summary = useMemo(() => {
    let ok = 0, m = 0, x = 0;
    Object.values(picks).forEach((o) => {
      Object.values(o).forEach((s) => {
        if (s === "available") ok++;
        else if (s === "maybe") m++;
        else if (s === "unavail") x++;
      });
    });
    return { ok, m, x, total: ok + m + x };
  }, [picks]);

  const dayCount = (id: string) =>
    Object.keys(picks[id] || {}).filter((t) => picks[id][t]).length;

  const onTapSlot = (time: string) => {
    setPicks((prev) => {
      const day = { ...(prev[activeDate] || {}) };
      if (day[time] === mode) delete day[time];
      else day[time] = mode;
      return { ...prev, [activeDate]: day };
    });
  };

  const onQuick = (kind: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (kind === "reset") return {};
      if (kind === "clear-day") {
        const n = { ...prev };
        delete n[activeDate];
        return n;
      }
      if (kind === "weekday-evening") {
        ["6.4","6.5","6.8","6.9"].forEach((id) => {
          next[id] = { ...(next[id] || {}), "오후 7:00":"available","오후 7:30":"available","오후 8:00":"available" };
        });
      }
      if (kind === "weekend-afternoon") {
        ["6.6","6.7"].forEach((id) => {
          next[id] = { ...(next[id] || {}), "오후 6:00":"available","오후 6:30":"available","오후 7:00":"available" };
        });
      }
      return next;
    });
  };

  const handleSubmit = () => {
    router.push(`/invite/${token}/submitted`);
  };

  return (
    <div className="screen">
      <TopBar
        title="6월 전시 모임"
        onBack={() => router.back()}
        right={<span className="pill ok" style={{ marginRight: 12 }}>● 응답 수집 중</span>}
      />

      {/* Meeting summary strip */}
      <div style={{
        padding: "12px 20px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-line)",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div className="t-body2" style={{ color: "var(--color-text-2)" }}>
          6.1 – 6.14 · 예상 <b style={{ color: "var(--color-text)" }}>2시간</b> · 마감{" "}
          <b style={{ color: "var(--color-text)" }}>5.30 (금) 23:59</b>
        </div>
        <div className="t-cap">비회원 참여 중 · 응답 마감일까지 수정할 수 있어요</div>
      </div>

      {/* Date tabs */}
      <div className="h-scroll" style={{
        gap: 6, padding: "12px 16px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-line)",
      }}>
        {DATES.map((d) => (
          <DateTab
            key={d.id}
            label={d.label} weekday={d.weekday}
            active={activeDate === d.id}
            count={dayCount(d.id)}
            onClick={() => setActiveDate(d.id)}
          />
        ))}
      </div>

      {/* Scrollable body */}
      <div className="scroll" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-cap">상태를 고른 뒤 시간을 눌러주세요.</div>
          <ModeToggle value={mode} onChange={setMode} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekday-evening")}>
            평일 저녁 가능
          </button>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekend-afternoon")}>
            주말 오후 가능
          </button>
          <button className="chip danger" style={{ justifyContent: "center" }} onClick={() => onQuick("reset")}>
            전체 초기화
          </button>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("clear-day")}>
            오늘 선택 지우기
          </button>
        </div>

        <div className="divider" />

        <div className="slot-grid">
          {TIMES.map((t) => (
            <TimeSlot
              key={t}
              time={t}
              state={picks[activeDate]?.[t] ?? null}
              onTap={() => onTapSlot(t)}
            />
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="bottom-bar">
        <div className="summary">
          <span>선택한 시간 <b>{summary.total}개</b></span>
          <span>가능 {summary.ok} · 애매 {summary.m} · 불가 {summary.x}</span>
        </div>
        <Button block primary onClick={handleSubmit} disabled={summary.total === 0}>
          제출하기
        </Button>
      </div>
    </div>
  );
}
