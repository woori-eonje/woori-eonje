"use client";

interface StatRowProps {
  ok: number;
  m: number;
  x: number;
  emphasized?: boolean;
}

export function StatRow({ ok, m, x, emphasized }: StatRowProps) {
  const numStyle = emphasized
    ? { fontSize: 15, fontWeight: 800 }
    : { fontSize: 13, fontWeight: 700 };

  return (
    <div style={{ display: "flex", gap: 14, color: "var(--color-text-2)", flexWrap: "wrap" as const, alignItems: "baseline" }}>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-primary)", display: "inline-block", transform: "translateY(-1px)" }} />
        <b style={{ color: "var(--color-primary)", ...numStyle }}>{ok}</b>
        <span style={{ color: "var(--color-primary)", fontSize: 12, fontWeight: 600 }}>가능</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "8px solid var(--color-maybe)", display: "inline-block", transform: "translateY(-1px)" }} />
        <b style={{ color: "var(--color-maybe-text)", ...numStyle }}>{m}</b>
        <span style={{ color: "var(--color-maybe-text)", fontSize: 12, fontWeight: 600 }}>애매</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 10, height: 2, background: "var(--color-text-muted)", display: "inline-block", transform: "translateY(-3px)" }} />
        <b style={{ color: "var(--color-text-muted)", ...numStyle }}>{x}</b>
        <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600 }}>불가</span>
      </span>
    </div>
  );
}
