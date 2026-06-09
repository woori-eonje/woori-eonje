"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/primitives";
import { Share, Clock, CalendarCheck, PlusCircle } from "@/components/icons";

const KICKERS = [
  "친구랑 만날까",
  "여행 떠나지",
  "팀이랑 회의해",
  "스터디 모일까",
];

export default function LandingPage() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % KICKERS.length), 2200);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div className="screen white" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: "none",
        }}
      >
        <Logo size={28} />
      </div>

      <div
        className="scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: "12px 20px 24px",
        }}
      >
        {/* Hero */}
        <div style={{ position: "relative", paddingTop: 8 }}>
          {/* Decorative shapes */}
          <svg
            width="42"
            height="32"
            viewBox="0 0 64 48"
            style={{ position: "absolute", top: 8, right: 4 }}
            aria-hidden="true"
          >
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
            <circle cx="24" cy="22" r="2" fill="#fff" />
            <circle cx="40" cy="22" r="2" fill="#fff" />
            <path
              d="M24 30 Q32 36 40 30"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <svg
            width="36"
            height="22"
            viewBox="0 0 80 44"
            style={{ position: "absolute", top: 56, right: 56 }}
            aria-hidden="true"
          >
            <path
              d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z"
              fill="#D6E7FF"
            />
          </svg>
          <svg
            width="32"
            height="32"
            viewBox="0 0 56 36"
            style={{ position: "absolute", top: 96, right: 10 }}
            aria-hidden="true"
          >
            <path d="M0 36 Q0 0 28 0 Q56 0 56 36 Z" fill="#E6DBF7" />
          </svg>

          {/* Rolling kicker */}
          <div
            aria-live="polite"
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "var(--color-text-2)",
              background: "var(--color-bg-2)",
              padding: "5px 12px",
              borderRadius: 999,
              marginBottom: 16,
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>
              우리 언제,&nbsp;
            </span>
            <span
              className="roll-mask"
              style={{ height: "1.2em", lineHeight: 1.2 }}
            >
              <span
                className="roll-track"
                style={{ transform: `translateY(-${idx * 1.2}em)` }}
              >
                {KICKERS.map((k, i) => (
                  <span
                    key={i}
                    className="roll-line"
                    style={{
                      height: "1.2em",
                      lineHeight: 1.2,
                      color: "var(--color-text)",
                    }}
                  >
                    {k}
                  </span>
                ))}
              </span>
            </span>
            <span
              style={{
                color: "var(--color-accent)",
                fontWeight: 800,
                marginLeft: 1,
              }}
            >
              ?
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: "-0.035em",
            }}
          >
            언제 되는지,
            <br />
            <span style={{ color: "var(--color-text)" }}>
              이제 한 번에 모아봐요.
            </span>
          </h1>
          <p
            className="t-body"
            style={{
              marginTop: 14,
              color: "var(--color-text-2)",
              maxWidth: 320,
            }}
          >
            모임장이 기간만 정하면, 우리가 흩어진 답변을 정리해서 가장 잘 맞는
            시간을 찾아드려요.
          </p>
        </div>

        {/* Flow preview */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-line)",
            borderRadius: 20,
            padding: "18px 18px 6px",
          }}
        >
          <div
            className="t-cap"
            style={{
              color: "var(--color-text-2)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            이렇게 흘러가요
          </div>
          {[
            {
              label: "초대 링크 공유",
              sub: "단톡방에 링크 하나만",
              Icon: Share,
              bg: "var(--color-baby-blue)",
              fg: "#1A4F87",
            },
            {
              label: "가능한 시간 고르기",
              sub: "탭으로 빠르게",
              Icon: Clock,
              bg: "var(--color-lavender)",
              fg: "#5A3D8A",
            },
            {
              label: "가장 잘 맞는 시간 확인",
              sub: "모두에게 맞춰서",
              Icon: CalendarCheck,
              bg: "var(--color-primary-soft)",
              fg: "var(--color-primary)",
            },
          ].map((s, i, a) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 0",
                borderBottom:
                  i < a.length - 1 ? "1px dashed var(--color-line)" : "none",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: s.bg,
                  color: s.fg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <s.Icon size={18} color={s.fg} stroke={1.85} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.label}
                </div>
                <div className="t-cap" style={{ marginTop: 2 }}>
                  {s.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline strip */}
        <div
          style={{
            background: "var(--color-primary-soft)",
            border: "1px solid var(--color-primary-soft-2)",
            borderRadius: 16,
            padding: "14px 16px",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.55,
            letterSpacing: "-0.015em",
            color: "var(--color-primary)",
          }}
        >
          모두의 가능한 시간을 모아,
          <br />
          <strong style={{ fontWeight: 800 }}>
            가장 잘 맞는 시간을 찾아주는 모임 조율 서비스
          </strong>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bottom-bar">
        <Link
          href="/meetings/new"
          className="btn primary block"
          style={{ justifyContent: "center" }}
        >
          <PlusCircle size={18} color="#fff" />
          <span>모임 만들기</span>
        </Link>
        <Link
          href="/meetings"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--color-text-2)",
            fontFamily: "inherit",
            fontSize: 13,
            padding: 6,
            cursor: "pointer",
            textAlign: "center",
            display: "block",
            textDecoration: "none",
          }}
        >
          내 모임 목록 보기 →
        </Link>
      </div>
    </div>
  );
}
