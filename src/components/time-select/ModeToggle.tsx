"use client";

import type { SlotState } from "@/types/meeting";

const STATE_INFO: Record<SlotState, { tag: string }> = {
  available: { tag: "○ 가능" },
  maybe:     { tag: "△ 애매" },
  unavail:   { tag: "✕ 불가" },
};

interface ModeToggleProps {
  value: SlotState;
  onChange: (v: SlotState) => void;
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="toggle" role="tablist" aria-label="현재 선택 모드">
      {(["available", "maybe", "unavail"] as SlotState[]).map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          className={value === s ? `on ${s}` : ""}
          onClick={() => onChange(s)}
        >
          {STATE_INFO[s].tag}
        </button>
      ))}
    </div>
  );
}
