"use client";

import { useState, useMemo, useEffect, use, useCallback, useRef } from "react";
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
  fetchSlots,
  fetchMyPicks,
  submitAvailability,
  type DayGroup,
  type DaySlot,
} from "@/lib/availability";

const MODE_LABEL: Record<SlotState, string> = {
  available: "가능",
  maybe: "애매",
  unavail: "불가",
};

type CopyScope = "copy-all" | "copy-weekdays" | "copy-weekends";

export default function TimeSelectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [vm, setVm] = useState<InviteVM | null>(null);
  const [participant, setParticipant] = useState<StoredParticipant | null>(null);
  const [days, setDays] = useState<DayGroup[]>([]);
  const [activeDate, setActiveDate] = useState<string>("");
  const [mode, setMode] = useState<SlotState>("available");
  const [copyScope, setCopyScope] = useState<CopyScope>("copy-all");
  const [picks, setPicks] = useState<Record<number, SlotState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startKey: string;
    visited: Set<string>;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

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
      const inviteDto = await fetchInvite(token);
      if (inviteDto.status === "CONFIRMED") {
        router.replace(`/invite/${token}`);
        return;
      }
      const invite = toInviteVM(inviteDto);
      const [dayGroups, myPicks] = await Promise.all([
        fetchSlots(invite.meetingId),
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

  // 참여자는 1시간 슬롯 단위로 응답하고, 백엔드가 소요시간만큼 연속 가능한 구간을 계산한다.
  const summary = useMemo(() => {
    let ok = 0, m = 0, x = 0;
    for (const d of days) {
      for (const slot of d.slots) {
        const s = picks[slot.slotId];
        if (s === "available") ok++;
        else if (s === "maybe") m++;
        else if (s === "unavail") x++;
      }
    }
    return { ok, m, x, total: ok + m + x };
  }, [days, picks]);

  const activeDay = days.find((d) => d.dateKey === activeDate);
  const activeDayHasPicks = activeDay?.slots.some((slot) => picks[slot.slotId] !== undefined) ?? false;

  const dayCounts = (dateKey: string) => {
    const d = days.find((g) => g.dateKey === dateKey);
    const counts = { available: 0, maybe: 0, unavailable: 0 };
    if (!d) return counts;
    for (const slot of d.slots) {
      const state = picks[slot.slotId];
      if (state === "available") counts.available++;
      else if (state === "maybe") counts.maybe++;
      else if (state === "unavail") counts.unavailable++;
    }
    return counts;
  };

  const onTapSlot = (slot: DaySlot) => {
    if (suppressClickRef.current) return;
    setPicks((prev) => {
      const next = { ...prev };
      if (prev[slot.slotId] === mode) delete next[slot.slotId];
      else next[slot.slotId] = mode;
      return next;
    });
  };

  const paintSlot = useCallback((slot: DaySlot) => {
    setPicks((prev) => {
      return { ...prev, [slot.slotId]: mode };
    });
  }, [mode]);

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const slot = (event.target as HTMLElement).closest<HTMLElement>("[data-window-key]");
    const key = slot?.dataset.windowKey;
    if (!key) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startKey: key,
      visited: new Set([key]),
      dragging: false,
    };
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && moved < 8) return;

    const slot = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-window-key]");
    const key = slot?.dataset.windowKey;
    if (!key) return;

    if (!drag.dragging) {
      drag.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const firstSlot = activeDay?.slots.find((slot) => String(slot.slotId) === drag.startKey);
      if (firstSlot) paintSlot(firstSlot);
    }
    if (drag.visited.has(key)) return;

    const nextSlot = activeDay?.slots.find((slot) => String(slot.slotId) === key);
    if (!nextSlot) return;
    drag.visited.add(key);
    paintSlot(nextSlot);
  };

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.dragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onLostPointerCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.dragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
  };

  const onQuick = (
    kind: "reset" | "clear-day" | "fill-day" | CopyScope,
  ) => {
    setPicks((prev) => {
      if (kind === "reset") return {};
      const next = { ...prev };
      if (kind === "clear-day") {
        activeDay?.slots.forEach((slot) => delete next[slot.slotId]);
        return next;
      }
      if (kind.startsWith("copy-")) {
        const pattern = new Map(
          activeDay?.slots.map((slot) => [slot.timeLabel, prev[slot.slotId]]) ?? [],
        );
        days
          .filter((day) => {
            if (day.dateKey === activeDate) return false;
            if (kind === "copy-weekdays") return !day.weekend;
            if (kind === "copy-weekends") return day.weekend;
            return true;
          })
          .forEach((day) => day.slots.forEach((slot) => {
            const state = pattern.get(slot.timeLabel);
            if (state) next[slot.slotId] = state;
            else delete next[slot.slotId];
          }));
        return next;
      }
      activeDay?.slots.forEach((slot) => (next[slot.slotId] = mode));
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
      if (e instanceof ApiError && e.code === "AVAILABILITY_REQUIRED") {
        setError("시간을 하나 이상 선택해 주세요.");
        setSubmitting(false);
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
              counts={dayCounts(d.dateKey)}
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
            <div className="t-cap">상태를 고른 뒤 1시간씩 누르거나 여러 시간을 쓸어 선택하세요. (모임 소요 {vm.durationLabel})</div>
            <ModeToggle value={mode} onChange={setMode} />
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            padding: 14, borderRadius: 16,
            background: "var(--color-surface)", border: "1px solid var(--color-line)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="t-body2" style={{ fontWeight: 800 }}>빠른 설정</div>
                <div className="t-cap">현재 날짜를 먼저 완성한 뒤 다른 날짜에 복사하세요.</div>
              </div>
              <button
                type="button"
                onClick={() => onQuick("reset")}
                style={{
                  flexShrink: 0, border: 0, background: "transparent", padding: "6px 0",
                  color: "var(--color-error)", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                전체 초기화
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("fill-day")}>
                전체 {MODE_LABEL[mode]}
              </button>
              <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("clear-day")}>
                현재 날짜 지우기
              </button>
            </div>

            <div style={{ height: 1, background: "var(--color-line)" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="copy-scope" className="t-cap" style={{ fontWeight: 700 }}>현재 날짜 선택 일괄 적용</label>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
                <select
                  id="copy-scope"
                  className="input"
                  value={copyScope}
                  onChange={(event) => setCopyScope(event.target.value as CopyScope)}
                  style={{ minWidth: 0 }}
                >
                  <option value="copy-all">모든 날짜에</option>
                  <option value="copy-weekdays">평일에만</option>
                  <option value="copy-weekends">주말에만</option>
                </select>
                <button className="chip" style={{ justifyContent: "center", paddingInline: 18, height: 48, borderRadius: "var(--radius-md)" }} onClick={() => onQuick(copyScope)} disabled={!activeDayHasPicks}>
                  적용
                </button>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div
            className="slot-grid"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            onLostPointerCapture={onLostPointerCapture}
            onDragStart={(event) => event.preventDefault()}
            style={{ touchAction: "pan-y" }}
          >
            {activeDay?.slots.map((slot) => (
              <TimeSlot
                key={slot.slotId}
                windowKey={String(slot.slotId)}
                time={slot.timeLabel}
                state={picks[slot.slotId] ?? null}
                onTap={() => onTapSlot(slot)}
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
