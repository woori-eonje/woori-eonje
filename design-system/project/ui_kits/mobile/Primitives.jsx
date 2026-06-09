/* Primitives.jsx — small UI primitives for the 우리 언제? mobile kit.
   Loaded BEFORE all screens. Exports to window. */

const { useState } = React;

/* ===== Icons (Lucide-style inline SVG, stroke 1.75–2) ================ */
const Icon = ({ d, size = 22, color = "currentColor", stroke = 1.75, fill = "none", children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  ChevronLeft: (p) => <Icon {...p} d="M15 18l-6-6 6-6" />,
  ChevronRight: (p) => <Icon {...p} d="M9 18l6-6-6-6" />,
  Check: (p) => <Icon {...p} stroke={2.25}><polyline points="20 6 9 17 4 12" /></Icon>,
  X: (p) => <Icon {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></Icon>,
  Calendar: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>,
  Users: (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  Copy: (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>,
  Share: (p) => <Icon {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></Icon>,
  Bolt: (p) => <Icon {...p} fill="currentColor" stroke="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" /><path d="M3 21v-5h5" /></Icon>,
  Sparkle: (p) => <Icon {...p} stroke={2}><path d="M12 3l1.5 6L20 10l-6.5 1L12 17l-1.5-6L4 10l6.5-1z" /></Icon>,
  PlusCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></Icon>,
  BookOpen: (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>,
  Briefcase: (p) => <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Icon>,
  MessageCircle: (p) => <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Icon>,
  CalendarCheck: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></Icon>,
  CheckCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></Icon>,
  Question: (p) => (
    <span style={{
      color: "var(--color-accent)",
      fontWeight: 900,
      fontSize: (p && p.size) || 22,
      lineHeight: 1,
      letterSpacing: "-0.04em"
    }}>?</span>
  ),
};

/* ===== Button ========================================================
   Accepts either:   <Button variant="primary">  …
   or boolean flags: <Button primary>, <Button outline>, etc.          */
function Button({
  variant,
  primary, secondary, outline, ghost, danger,
  block, leftIcon, rightIcon, children,
  ...rest
}) {
  const v = variant
    || (primary && "primary")
    || (secondary && "secondary")
    || (outline && "outline")
    || (ghost && "ghost")
    || (danger && "danger")
    || "primary";
  return (
    <button className={`btn ${v} ${block ? "block" : ""}`} {...rest}>
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}

/* ===== TopBar ======================================================== */
function TopBar({ title, onBack, right }) {
  return (
    <div className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <Icons.ChevronLeft size={22} />
        </button>
      ) : (
        <span className="spacer" />
      )}
      <div className="title">{title}</div>
      {right || <span className="spacer" />}
    </div>
  );
}

/* ===== Logo ========================================================== */
function Logo({ size = 36 }) {
  return (
    <img
      src="../../assets/logo.svg"
      alt="우리 언제?"
      style={{ height: size, display: "block" }}
    />
  );
}

/* ===== StatusPill ==================================================== */
function StatusPill({ status }) {
  const map = {
    COLLECTING:        { cls: "ok",    label: "응답 수집 중",  dot: "var(--color-primary)" },
    READY_TO_CONFIRM:  { cls: "maybe", label: "확정 필요",     dot: "var(--color-maybe)" },
    CONFIRMED:         { cls: "ok",    label: "✓ 확정됨",      dot: null },
    CLOSED:            { cls: "gray",  label: "종료됨",        dot: "var(--color-text-muted)" },
    EXPIRED:           { cls: "accent",label: "⚠ 마감됨",      dot: null },
  };
  const s = map[status] || map.COLLECTING;
  return (
    <span className={`pill ${s.cls}`}>
      {s.dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, display: "inline-block" }} />}
      {s.label}
    </span>
  );
}

/* ===== Brand decoration ============================================== */
function BrandDecor({ children }) {
  return (
    <div style={{ position: "relative" }}>
      {/* Forest half-dome (top-right) */}
      <svg width="56" height="44" viewBox="0 0 64 48" style={{ position: "absolute", top: -8, right: -10, opacity: 0.9 }}>
        <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
        <circle cx="24" cy="22" r="2" fill="#fff" />
        <circle cx="40" cy="22" r="2" fill="#fff" />
        <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      {/* Lavender scalloped cloud */}
      <svg width="64" height="52" viewBox="0 0 76 62" style={{ position: "absolute", top: 36, right: 16 }}>
        <g fill="#E6DBF7">
          <circle cx="14" cy="36" r="14" /><circle cx="30" cy="20" r="14" />
          <circle cx="48" cy="18" r="16" /><circle cx="62" cy="36" r="14" />
          <circle cx="38" cy="46" r="16" />
        </g>
        <circle cx="32" cy="32" r="2" fill="#333" />
        <circle cx="46" cy="32" r="2" fill="#333" />
        <path d="M32 40 Q39 46 46 40" stroke="#333" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      {/* Poppy spark (bottom-left) */}
      <svg width="22" height="22" viewBox="0 0 36 36" style={{ position: "absolute", left: 4, bottom: -6 }}>
        <path d="M18 0 L20 14 L34 16 L20 18 L18 36 L16 18 L2 16 L16 14 Z" fill="#FF6B6B" />
      </svg>
      {/* Baby Blue rainbow */}
      <svg width="44" height="24" viewBox="0 0 80 44" style={{ position: "absolute", left: 18, top: -2 }}>
        <path d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z" fill="#D6E7FF" />
      </svg>
      {children}
    </div>
  );
}

Object.assign(window, { Icon, Icons, Button, TopBar, Logo, StatusPill, BrandDecor });
