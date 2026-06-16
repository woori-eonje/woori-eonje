"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/primitives";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiError } from "@/lib/api";
import { updateMeeting } from "@/lib/meetings";
import type { MeetingCategory, MeetingDetail } from "@whenwe/types";

function toYMD(d: Date) { return d.toLocaleDateString("sv"); }
// 마감은 생성 위저드와 동일하게 "선택일 23:59 KST" 정책. 전체 교체라 마감일을
// 건드리지 않아도 시각은 23:59 로 정규화된다(생성도 항상 23:59 라 실데이터는 동일).
function toDeadlineISO(d: Date) { return `${toYMD(d)}T23:59:00+09:00`; }

const CATEGORIES: { id: MeetingCategory; label: string }[] = [
  { id: "FRIEND", label: "친구" },
  { id: "STUDY", label: "스터디" },
  { id: "BUSINESS", label: "비즈니스" },
];
const DURATIONS = [1, 2, 3, 4, 5];

// 모임 수정 모달 — 응답자 0명 + 수집 중일 때만 진입. 생성과 동일 필드 전체 교체(PATCH).
export function MeetingEditModal({
  meeting,
  onClose,
  onUpdated,
}: {
  meeting: MeetingDetail;
  onClose: () => void;
  onUpdated: (m: MeetingDetail) => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [desc, setDesc] = useState(meeting.description ?? "");
  const [category, setCategory] = useState<MeetingCategory>(meeting.category);
  const [from, setFrom] = useState<Date | undefined>(new Date(`${meeting.startDate}T00:00:00`));
  const [to, setTo] = useState<Date | undefined>(new Date(`${meeting.endDate}T00:00:00`));
  const [due, setDue] = useState<Date | undefined>(new Date(meeting.responseDeadline));
  const [startTime, setStartTime] = useState(meeting.availableStartTime);
  const [endTime, setEndTime] = useState(meeting.availableEndTime);
  const [duration, setDuration] = useState(meeting.durationHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC 로 닫기(저장 중 제외).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxEnd = from ? new Date(from.getTime() + 13 * 86400000) : undefined;
  const maxDue = from ? new Date(from.getTime() - 86400000) : undefined;
  const valid = title.trim().length >= 2 && !!from && !!to && !!due;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMeeting(meeting.meetingId, {
        title: title.trim(),
        description: desc.trim() || null,
        category,
        startDate: toYMD(from!),
        endDate: toYMD(to!),
        availableStartTime: startTime,
        availableEndTime: endTime,
        durationHours: duration,
        responseDeadline: toDeadlineISO(due!),
      });
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "수정 중 오류가 생겼어요.");
      setSaving(false);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>{label}</label>
      {node}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onClick={() => !saving && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)", borderRadius: 20,
          padding: 24, width: "100%", maxWidth: 420,
          maxHeight: "85vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h3 id="edit-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em" }}>모임 수정</h3>

        {field("모임명", (
          <input className="input" value={title} maxLength={24} onChange={(e) => setTitle(e.target.value)} />
        ))}
        {field("한 줄 설명", (
          <input className="input" value={desc} maxLength={60} onChange={(e) => setDesc(e.target.value)} placeholder="설명 (선택)" />
        ))}
        {field("모임 성격", (
          <div style={{ display: "flex", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, fontFamily: "inherit",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: category === c.id ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                background: category === c.id ? "var(--color-primary-soft)" : "#fff",
                color: category === c.id ? "var(--color-primary)" : "var(--color-text)",
              }}>{c.label}</button>
            ))}
          </div>
        ))}
        {field("후보 기간 시작", (
          <DatePicker value={from} onChange={(d) => { setFrom(d); setTo(undefined); setDue(undefined); }} fromDate={today} placeholder="시작일" />
        ))}
        {field("후보 기간 종료", (
          <DatePicker value={to} onChange={setTo} fromDate={from ? new Date(from.getTime() + 86400000) : today} toDate={maxEnd} disabled={!from} placeholder="종료일 (최대 14일)" />
        ))}
        {field("선택 가능 시간대", (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input className="input" type="time" step="3600" value={startTime} onChange={(e) => setStartTime(`${e.target.value.split(":")[0]}:00`)} style={{ flex: 1 }} />
            <span style={{ color: "var(--color-text-muted)" }}>–</span>
            <input className="input" type="time" step="3600" value={endTime} onChange={(e) => setEndTime(`${e.target.value.split(":")[0]}:00`)} style={{ flex: 1 }} />
          </div>
        ))}
        {field("예상 소요 시간", (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DURATIONS.map((h) => (
              <button key={h} type="button" onClick={() => setDuration(h)} style={{
                padding: "8px 14px", borderRadius: 999, fontFamily: "inherit",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: duration === h ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                background: duration === h ? "var(--color-primary-soft)" : "#fff",
                color: duration === h ? "var(--color-primary)" : "var(--color-text)",
              }}>{h}시간</button>
            ))}
          </div>
        ))}
        {field("응답 마감일", (
          <DatePicker value={due} onChange={setDue} fromDate={today} toDate={maxDue} disabled={!from} placeholder="마감일 (시작일 전날까지)" />
        ))}

        {error && (
          <p className="t-cap" style={{ color: "var(--color-error)", fontWeight: 600, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Button block secondary disabled={saving} onClick={onClose}>취소</Button>
          <Button block primary disabled={!valid || saving} onClick={handleSave}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
