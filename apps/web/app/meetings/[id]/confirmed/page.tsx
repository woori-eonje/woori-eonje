"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button, StatusPill } from "@/components/primitives";
import { Calendar, Share } from "@/components/icons";

const PARTICIPANTS = ["소미", "지현", "민수", "유나", "태오", "하린"];
const AVATAR_BG = ["#1A9562","#D6E7FF","#E6DBF7","#F5AB54","#1A9562","#D6E7FF"];
const AVATAR_FG = ["#fff","#333","#333","#fff","#fff","#333"];

export default function ConfirmedPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="screen">
      <TopBar
        title="확정된 일정"
        onBack={() => router.back()}
        right={<StatusPill status="CONFIRMED" />}
      />

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
          {/* Forest half-dome decoration */}
          <svg width="56" height="40" viewBox="0 0 64 48" style={{ position: "absolute", top: -8, right: -10, opacity: 0.9 }} aria-hidden="true">
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
            <circle cx="24" cy="22" r="2" fill="#fff" />
            <circle cx="40" cy="22" r="2" fill="#fff" />
            <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>

          <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>6월 전시 모임 · 확정</div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.04em" }}>
            6.8 (토)<br />오후 2:00 – 4:00
          </h2>
          <div className="dashed-divider" />
          <p className="t-body2">6월 초에 전시 보러 갈 사람들 일정 조율</p>
        </div>

        {/* Participants */}
        <div className="card tight" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            참여자 {PARTICIPANTS.length}명
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {PARTICIPANTS.map((p, i) => (
              <span key={p} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px",
                background: "var(--color-bg)", borderRadius: 999,
                fontSize: 13, fontWeight: 700,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 999,
                  background: AVATAR_BG[i % AVATAR_BG.length],
                  color: AVATAR_FG[i % AVATAR_FG.length],
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                }}>
                  {p[0]}
                </span>
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Calendar row */}
        <div className="card tight" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--color-primary-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={20} color="var(--color-primary)" />
          </span>
          <div style={{ flex: 1 }}>
            <div className="t-body" style={{ fontWeight: 700 }}>캘린더에 추가</div>
            <div className="t-cap">Google · Apple · .ics 파일</div>
          </div>
          <button style={{
            background: "var(--color-primary-soft)", color: "var(--color-primary)",
            border: "none", borderRadius: 10, padding: "6px 12px",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            추가
          </button>
        </div>

        {/* Info strip */}
        <div style={{
          background: "var(--color-primary-soft)", borderRadius: 14,
          padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: "var(--color-primary)", fontWeight: 600,
        }}>
          이 링크를 공유하면 참여자들도 확정된 일정을 확인할 수 있어요.
        </div>
      </div>

      <div className="bottom-bar">
        <Button
          block
          primary
          onClick={handleCopy}
          leftIcon={<Share size={18} color="#fff" />}
        >
          {copied ? "링크 복사됨!" : "공유 링크 복사"}
        </Button>
      </div>
    </div>
  );
}
