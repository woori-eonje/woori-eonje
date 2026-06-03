"use client";

interface DateTabProps {
  active: boolean;
  label: string;
  weekday: string;
  count: number;
  onClick: () => void;
}

export function DateTab({ active, label, weekday, count, onClick }: DateTabProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "none", minWidth: 64,
        padding: "10px 12px",
        border: active ? "1px solid var(--color-primary)" : "1px solid transparent",
        background: active ? "var(--color-primary-soft)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-text)",
        borderRadius: 14,
        fontFamily: "inherit",
        letterSpacing: "-0.015em",
        cursor: "pointer",
        textAlign: "center",
        transition: "background 160ms, border-color 160ms",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{weekday}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{label}</div>
      {count > 0 && (
        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: "var(--color-primary)" }}>
          ● {count}
        </div>
      )}
    </button>
  );
}
