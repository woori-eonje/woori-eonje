"use client";

import { useState, useMemo, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { DateTab } from "@/components/time-select/DateTab";
import { TimeSlot } from "@/components/time-select/TimeSlot";
import { ModeToggle } from "@/components/time-select/ModeToggle";
import type { SlotState } from "@/types/meeting";
import { ApiError } from "@/lib/api";
import { fetchInvite, toInviteVM, type InviteVM } from "@/lib/invite";
import { loadParticipant, type StoredParticipant } from "@/lib/participant";
import {
  fetchSlotWindows,
  fetchMyPicks,
  submitAvailability,
  type WindowDayGroup,
  type WindowItem,
} from "@/lib/availability";

// 한 블록(연속 슬롯 묶음)의 상태: 모든 슬롯이 같은 상태면 그 상태, 아니면 null(미선택/혼합).
function windowState(
  slotIds: number[],
  picks: Record<number, SlotState>,
): SlotState | null {
  let s: SlotState | undefined;
  for (const id of slotIds) {
    const v = picks[id];
    if (v === undefined) return null;
    if (s === undefined) s = v;
    else if (s !== v) return null;
  }
  return s ?? null;
}

export default function TimeSelectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [vm, setVm] = useState<InviteVM | null>(null);
  const [participant, setParticipant] = useState<StoredParticipant | null>(null);
  const [days, setDays] = useState<WindowDayGroup[]>([]);
  const [activeDate, setActiveDate] = useState<string>("");
  const [mode, setMode] = useState<SlotState>("available");
  const [picks, setPicks] = useState<Record<number, SlotState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = loadParticipant(token);
    if (!p) {
      // 등록 안 한 브라우저면 초대 진입으로 되돌림
      router.replace(`/invite/${token}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const invite = toInviteVM(await fetchInvite(token));
      const [dayGroups, myPicks] = await Promise.all([
        fetchSlotWindows(invite.meetingId),
        fetchMyPicks(invite.meetingId, p.editToken),
      ]);
      setParticipant(p);
      setVm(invite);
      setDays(dayGroups);
      setActiveDate(dayGroups[0]?.dateKey ?? "");
      setPicks(myPicks);
    } catch (e) {
      // 회원(JWT) 경로에서 토큰이 없거나 만료면 로그인으로 유도(authGet 은 request() 밖에서
      // throw 라 자동 리다이렉트가 안 걸린다). 그 외는 일반 에러 + 재시도.
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
        router.replace(`/login?redirect=${encodeURIComponent(`/invite/${token}/time-select`)}`);
        return;
      }
      setError("시간 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    // 초기 데이터 로드 함수는 재시도 버튼에서도 공유한다. 내부 setState 는 async fetch 결과 동기화용이다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 선택 단위는 블록(window) — 블록 상태(uniform)별로 집계.
  const summary = useMemo(() => {
    let ok = 0, m = 0, x = 0;
    for (const d of days) {
      for (const w of d.windows) {
        const s = windowState(w.slotIds, picks);
        if (s === "available") ok++;
        else if (s === "maybe") m++;
        else if (s === "unavail") x++;
      }
    }
    return { ok, m, x, total: ok + m + x };
  }, [days, picks]);

  const activeDay = days.find((d) => d.dateKey === activeDate);

  const dayCount = (dateKey: string) => {
    const d = days.find((g) => g.dateKey === dateKey);
    if (!d) return 0;
    return d.windows.filter((w) => windowState(w.slotIds, picks) !== null).length;
  };

  // 블록 탭: 같은 상태면 해제(슬롯 제거), 아니면 블록의 모든 슬롯을 현재 모드로.
  const onTapWindow = (w: WindowItem) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (windowState(w.slotIds, prev) === mode) {
        for (const id of w.slotIds) delete next[id];
      } else {
        for (const id of w.slotIds) next[id] = mode;
      }
      return next;
    });
  };

  const onQuick = (kind: "reset" | "clear-day" | "weekday" | "weekend") => {
    setPicks((prev) => {
      if (kind === "reset") return {};
      const next = { ...prev };
      if (kind === "clear-day") {
        activeDay?.windows.forEach((w) => w.slotIds.forEach((id) => delete next[id]));
        return next;
      }
      const wantWeekend = kind === "weekend";
      days
        .filter((d) => d.weekend === wantWeekend)
        .forEach((d) => d.windows.forEach((w) => w.slotIds.forEach((id) => (next[id] = mode))));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (summary.total === 0 || submitting || !vm || !participant) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitAvailability(vm.meetingId, participant.editToken, participant.participantId, picks);
      router.push(`/invite/${token}/submitted`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
        router.replace(`/login?redirect=${encodeURIComponent(`/invite/${token}/time-select`)}`);
        return;
      }
      setError(
        e instanceof ApiError ? e.message : "제출에 실패했어요. 잠시 후 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen white">
        <div className="scroll center">
          <p className="t-body2">불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error || !vm) {
    return (
      <div className="screen white">
        <div className="scroll" style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <p className="t-body2">{error ?? "시간 정보를 불러오지 못했어요."}</p>
          <button
            className="btn outline"
            onClick={() => { void load(); }}
          >
            다시 시도
          </button>
          <button
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => router.push(`/invite/${token}`)}
          >
            초대 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar
        title={vm.title}
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
          {vm.periodLabel} · 예상 <b style={{ color: "var(--color-text)" }}>{vm.durationLabel}</b> · 마감{" "}
          <b style={{ color: "var(--color-text)" }}>{vm.deadlineLabel}</b>
        </div>
        <div className="t-cap">
          {participant?.editToken === null ? "회원" : "비회원"} 참여 중 · 응답 마감일까지 수정할 수 있어요
        </div>
      </div>

      {/* Date tabs */}
      {days.length > 0 && (
        <div className="h-scroll" style={{
          gap: 6, padding: "12px 16px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-line)",
        }}>
          {days.map((d) => (
            <DateTab
              key={d.dateKey}
              label={d.label} weekday={d.weekday}
              active={activeDate === d.dateKey}
              count={dayCount(d.dateKey)}
              onClick={() => setActiveDate(d.dateKey)}
            />
          ))}
        </div>
      )}

      {/* Scrollable body */}
      {days.length === 0 ? (
        <div className="scroll" style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <p className="t-body2">고를 수 있는 시간 블록이 없어요.</p>
          <button
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => router.push(`/invite/${token}`)}
          >
            초대 페이지로 돌아가기
          </button>
        </div>
      ) : (
        <div className="scroll" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="t-cap">상태를 고른 뒤 시간 블록을 눌러주세요. (소요 {vm.durationLabel} 단위)</div>
            <ModeToggle value={mode} onChange={setMode} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekday")}>
              평일 전체 선택
            </button>
            <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekend")}>
              주말 전체 선택
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
            {activeDay?.windows.map((w) => (
              <TimeSlot
                key={w.key}
                time={w.label}
                state={windowState(w.slotIds, picks)}
                onTap={() => onTapWindow(w)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky bottom CTA */}
      <div className="bottom-bar">
        {error && (
          <div className="t-cap" style={{ color: "var(--color-error)", fontWeight: 600 }}>{error}</div>
        )}
        <div className="summary">
          <span>선택한 시간 <b>{summary.total}개</b></span>
          <span>가능 {summary.ok} · 애매 {summary.m} · 불가 {summary.x}</span>
        </div>
        <Button block primary onClick={handleSubmit} disabled={summary.total === 0 || submitting}>
          {submitting ? "제출 중…" : "제출하기"}
        </Button>
      </div>
    </div>
  );
}
