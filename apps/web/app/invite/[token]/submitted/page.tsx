"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { fetchInvite, toInviteVM, type InviteVM } from "@/lib/invite";
import { loadParticipant } from "@/lib/participant";
import { fetchMyPicks } from "@/lib/availability";
import { getApiErrorMessage } from "@/lib/errors";
import type { SlotState } from "@/types/meeting";

function deadlineLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "마감됨";
  const h = Math.floor(diff / 3600000);
  return h < 24 ? `${h}시간` : `${Math.floor(h / 24)}일 ${h % 24}시간`;
}

export default function SubmittedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [vm, setVm] = useState<InviteVM | null>(null);
  const [responseDeadline, setResponseDeadline] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<number, SlotState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSummary = useCallback(() => {
    const participant = loadParticipant(token);
    if (!participant) {
      router.replace(`/invite/${token}`);
      return;
    }
    fetchInvite(token)
      .then(async (dto) => {
        setVm(toInviteVM(dto));
        setResponseDeadline(dto.responseDeadline);
        const myPicks = await fetchMyPicks(dto.meetingId, participant.editToken);
        setPicks(myPicks);
      })
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, "응답 요약을 불러오지 못했어요."));
      });
  }, [token, router]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const summary = useMemo(() => {
    let ok = 0, m = 0, x = 0;
    Object.values(picks).forEach((s) => {
      if (s === "available") ok++;
      else if (s === "maybe") m++;
      else x++;
    });
    return { ok, m, x };
  }, [picks]);

  const hasData = Object.keys(picks).length > 0;

  return (
    <div className="screen">
      <TopBar title={vm?.title ?? "모임"} />

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
          <div className="t-body" style={{ fontWeight: 700 }}>
            {loadError
              ? loadError
              : hasData
                ? `가능 ${summary.ok}개 · 애매 ${summary.m}개 · 불가 ${summary.x}개`
                : "불러오는 중…"}
          </div>
          {loadError && (
            <Button onClick={() => { setLoadError(null); fetchSummary(); }}>
              다시 시도
            </Button>
          )}
          {responseDeadline && (
            <div className="t-cap">
              마감까지 <b style={{ color: "var(--color-primary)" }}>{deadlineLeft(responseDeadline)}</b> 남았어요
            </div>
          )}
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
