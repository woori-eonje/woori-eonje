"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";

export default function SubmittedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  return (
    <div className="screen">
      <TopBar title="6월 전시 모임" />

      <div style={{
        padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 18,
        alignItems: "center", textAlign: "center", flex: 1,
      }}>
        {/* Illustration */}
        <div style={{ marginTop: 20, position: "relative", width: 220, height: 160 }}>
          {/* Forest half-dome with smile */}
          <svg width="120" height="86" viewBox="0 0 64 48" style={{ position: "absolute", top: 30, left: 50 }} aria-hidden="true">
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562" />
            <circle cx="24" cy="22" r="2.2" fill="#fff" />
            <circle cx="40" cy="22" r="2.2" fill="#fff" />
            <path d="M22 30 Q32 38 42 30" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          {/* Poppy spark */}
          <svg width="32" height="32" viewBox="0 0 36 36" style={{ position: "absolute", top: 0, right: 12 }} aria-hidden="true">
            <path d="M18 0 L20 14 L34 16 L20 18 L18 36 L16 18 L2 16 L16 14 Z" fill="#FF6B6B" />
          </svg>
          {/* Baby Blue arch */}
          <svg width="48" height="26" viewBox="0 0 80 44" style={{ position: "absolute", top: 16, left: 0 }} aria-hidden="true">
            <path d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z" fill="#D6E7FF" />
          </svg>
        </div>

        <h2 className="t-h1" style={{ marginTop: 4 }}>응답을 보냈어요</h2>
        <p className="t-body" style={{ color: "var(--color-text-2)", maxWidth: 280 }}>
          결과는 마감일에 알려드릴게요. 마감 전까지는 언제든 응답을 수정할 수 있어요.
        </p>

        {/* Summary card */}
        <div style={{
          marginTop: 8, width: "100%",
          background: "var(--color-surface)", border: "1px solid var(--color-line)",
          borderRadius: 16, padding: 14,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div className="t-cap">내 응답 요약</div>
          <div className="t-body" style={{ fontWeight: 700 }}>가능 8개 · 애매 4개 · 불가 0개</div>
          <div className="t-cap">
            마감까지 <b style={{ color: "var(--color-primary)" }}>2일 6시간</b> 남았어요
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <Button
          block
          variant="outline"
          onClick={() => router.push(`/invite/${token}/time-select`)}
        >
          응답 수정
        </Button>
        <Button
          block
          variant="ghost"
          onClick={() => router.push(`/invite/${token}`)}
        >
          모임 정보 다시 보기
        </Button>
      </div>
    </div>
  );
}
