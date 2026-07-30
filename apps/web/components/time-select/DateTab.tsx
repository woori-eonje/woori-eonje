"use client";

interface DateTabProps {
  active: boolean;
  label: string;
  weekday: string;
  counts: {
    available: number;
    maybe: number;
    unavailable: number;
  };
  onClick: () => void;
}

const COUNT_ITEMS = [
  { key: "available", label: "가능", color: "var(--color-primary)" },
  { key: "maybe", label: "애매", color: "var(--color-maybe)" },
  { key: "unavailable", label: "불가", color: "var(--color-text-muted)" },
] as const;

export function DateTab({ active, label, weekday, counts, onClick }: DateTabProps) {
  const countLabel = COUNT_ITEMS
    .filter(({ key }) => counts[key] > 0)
    .map(({ key, label: stateLabel }) => `${stateLabel} ${counts[key]}개`)
    .join(", ");

  return (
    <button
      onClick={onClick}
      aria-label={`${weekday} ${label}${countLabel ? `, ${countLabel}` : ", 선택 없음"}`}
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
      {countLabel && (
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            minHeight: 15,
            marginTop: 4,
          }}
        >
          {COUNT_ITEMS.filter(({ key }) => counts[key] > 0).map(({ key, color }) => (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                color,
                fontSize: 9,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: 7 }}>●</span>
              {counts[key]}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
