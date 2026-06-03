"use client";

import React from "react";
import Image from "next/image";
import { ChevronLeft } from "./icons";

/* ── Button ── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  primary?: boolean;
  secondary?: boolean;
  outline?: boolean;
  ghost?: boolean;
  danger?: boolean;
  block?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
export function Button({
  variant,
  primary, secondary, outline, ghost, danger,
  block,
  leftIcon,
  rightIcon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const v = variant
    || (primary && "primary")
    || (secondary && "secondary")
    || (outline && "outline")
    || (ghost && "ghost")
    || (danger && "danger")
    || "primary";
  return (
    <button
      className={`btn ${v} ${block ? "block" : ""} ${className}`}
      {...rest}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}

/* ── TopBar ── */
interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}
export function TopBar({ title, onBack, right }: TopBarProps) {
  return (
    <div className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="spacer-btn" />
      )}
      {title && <div className="title">{title}</div>}
      {right || <span className="spacer-btn" />}
    </div>
  );
}

/* ── Logo ── */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="우리 언제?"
      height={size}
      width={size * 3.5}
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

/* ── StatusPill ── */
type MeetingStatus = "COLLECTING" | "READY_TO_CONFIRM" | "CONFIRMED" | "CLOSED" | "EXPIRED";
const STATUS_MAP: Record<MeetingStatus, { cls: string; label: string; dot?: string }> = {
  COLLECTING:        { cls: "ok",    label: "응답 수집 중",  dot: "var(--color-primary)" },
  READY_TO_CONFIRM:  { cls: "maybe", label: "확정 필요",     dot: "var(--color-maybe)" },
  CONFIRMED:         { cls: "ok",    label: "✓ 확정됨" },
  CLOSED:            { cls: "gray",  label: "종료됨",        dot: "var(--color-text-muted)" },
  EXPIRED:           { cls: "accent",label: "⚠ 마감됨" },
};
export function StatusPill({ status }: { status: MeetingStatus }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.COLLECTING;
  return (
    <span className={`pill ${s.cls}`}>
      {s.dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: 999,
            background: s.dot, display: "inline-block",
          }}
        />
      )}
      {s.label}
    </span>
  );
}

/* ── Brand decorative shapes ── */
export function BrandDecorForest({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="56" height="44" viewBox="0 0 64 48" style={style} aria-hidden="true">
      <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
      <circle cx="24" cy="22" r="2" fill="#fff" />
      <circle cx="40" cy="22" r="2" fill="#fff" />
      <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BrandDecorBabyBlue({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="44" height="24" viewBox="0 0 80 44" style={style} aria-hidden="true">
      <path d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z" fill="#D6E7FF" />
    </svg>
  );
}

export function BrandDecorPoppy({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="22" height="22" viewBox="0 0 36 36" style={style} aria-hidden="true">
      <path d="M18 0 L20 14 L34 16 L20 18 L18 36 L16 18 L2 16 L16 14 Z" fill="#FF6B6B" />
    </svg>
  );
}

export function BrandDecorLavender({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="64" height="52" viewBox="0 0 76 62" style={style} aria-hidden="true">
      <g fill="#E6DBF7">
        <circle cx="14" cy="36" r="14" /><circle cx="30" cy="20" r="14" />
        <circle cx="48" cy="18" r="16" /><circle cx="62" cy="36" r="14" />
        <circle cx="38" cy="46" r="16" />
      </g>
      <circle cx="32" cy="32" r="2" fill="#333" />
      <circle cx="46" cy="32" r="2" fill="#333" />
      <path d="M32 40 Q39 46 46 40" stroke="#333" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
