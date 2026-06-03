"use client";

import type { SlotState } from "@/types/meeting";

const STATE_INFO: Record<SlotState, { tag: string; short: string }> = {
  available: { tag: "○ 가능", short: "가능" },
  maybe:     { tag: "△ 애매", short: "애매" },
  unavail:   { tag: "✕ 불가", short: "불가" },
};

interface TimeSlotProps {
  time: string;
  state: SlotState | null;
  onTap: () => void;
}

export function TimeSlot({ time, state, onTap }: TimeSlotProps) {
  const cls = state === null ? "" :
    state === "available" ? "s-available" :
    state === "maybe" ? "s-maybe" : "s-unavail";
  const tag = state === null ? null : STATE_INFO[state].tag;

  return (
    <button
      type="button"
      className={`slot ${cls}`}
      onClick={onTap}
      aria-label={`${time} ${state ? STATE_INFO[state].short : "선택 안 함"}`}
    >
      <span>{time}</span>
      {tag
        ? <span className="tag">{tag}</span>
        : <span className="tag" style={{ opacity: 0.5 }}>—</span>
      }
    </button>
  );
}
