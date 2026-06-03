"use client";

import type { Participant } from "@/types/meeting";

const STATUS_LABEL: Record<string, string> = {
  available: "가능",
  maybe:     "애매",
  unavail:   "불가",
  pending:   "응답 대기",
};
const STATUS_CLS: Record<string, string> = {
  available: "ok",
  maybe:     "maybe",
  unavail:   "gray",
  pending:   "gray",
};

export function ParticipantRow({ name, status, required }: Participant) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <span style={{
        position: "relative",
        width: 24, height: 24, borderRadius: 999,
        background: "var(--color-bg-2)", color: "var(--color-text-2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flex: "none",
      }}>
        {name.slice(0, 1)}
        {required && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 8, height: 8, borderRadius: 999,
            background: "var(--color-accent)",
            border: "1.5px solid var(--color-surface)",
          }} aria-label="필수 참석자" />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {name}
          {required && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-accent)" }}>필수</span>}
        </span>
      </div>
      <span className={`pill ${STATUS_CLS[status] ?? "gray"}`} style={{ height: 22, fontSize: 11, padding: "0 8px" }}>
        {STATUS_LABEL[status] ?? "응답 대기"}
      </span>
    </div>
  );
}
