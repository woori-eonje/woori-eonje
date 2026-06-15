"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Logo } from "@/components/primitives";
import { Calendar, ChevronRight } from "@/components/icons";
import { ApiError, getToken } from "@/lib/api";
import { getMe } from "@/lib/auth";
import type { InviteVM } from "@/lib/invite";
import { registerParticipant, saveParticipant, loadParticipant } from "@/lib/participant";

export function InviteJoinView({ token, vm }: { token: string; vm: InviteVM }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length >= 2;

  useEffect(() => {
    if (!getToken()) return;
    setIsLoggedIn(true);
    getMe().then((user) => setName(user.nickname)).catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!valid || submitting) return;
    if (loadParticipant(token)) {
      router.push(`/invite/${token}/time-select`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await registerParticipant(token, name.trim());
      // 비회원(GUEST) 등록은 항상 edit token 을 발급한다. null 은 회원(MEMBER, Bearer)
      // 경로인데 현재 화면은 비회원만 등록하므로 도달하지 않는다(#4 FE 연동 시 JWT 사용).
      if (res.participantEditToken == null) {
        setError("로그인 참여는 아직 준비 중이에요. 닉네임으로 참여해 주세요.");
        setSubmitting(false);
        return;
      }
      saveParticipant(token, {
        participantId: res.participantId,
        editToken: res.participantEditToken,
        guestName: res.guestName,
      });
      router.push(`/invite/${token}/time-select`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "참여에 실패했어요. 잠시 후 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  };

  // 모임 정보 카드 (공통)
  const MeetingInfoCard = (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: 20, padding: 20,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 14,
          background: "var(--color-primary-soft)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Calendar size={22} color="var(--color-primary)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", letterSpacing: "0.04em" }}>{vm.categoryLabel}</div>
          <h2 className="t-h2">{vm.title}</h2>
        </div>
      </div>

      {vm.description && <p className="t-body2">{vm.description}</p>}

      <div className="divider" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div className="t-cap">조율 기간</div>
          <div className="t-body" style={{ fontWeight: 700 }}>{vm.periodLabel}</div>
        </div>
        <div>
          <div className="t-cap">예상 소요</div>
          <div className="t-body" style={{ fontWeight: 700 }}>{vm.durationLabel}</div>
        </div>
        <div>
          <div className="t-cap">선택 시간대</div>
          <div className="t-body2" style={{ fontWeight: 600 }}>{vm.timeWindowLabel}</div>
        </div>
        <div>
          <div className="t-cap">응답 마감</div>
          <div className="t-body" style={{ fontWeight: 700 }}>{vm.deadlineLabel}</div>
        </div>
      </div>
    </div>
  );

  // ── 로그인 상태 or 비회원 폼 단계 ──
  if (isLoggedIn || showGuestForm) {
    return (
      <div className="screen">
        <div style={{ padding: "14px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
          <Logo size={24} />
        </div>

        <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {MeetingInfoCard}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em" }}>
              닉네임 <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>*</span>
            </label>
            <input
              className="input"
              placeholder="단톡방에서 쓰는 이름이면 좋아요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              autoFocus={!isLoggedIn}
            />
            <div className="t-cap">2–12자 · 한글·영문·숫자</div>
            {error && (
              <div className="t-cap" style={{ color: "var(--color-error)", fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          {!isLoggedIn && (
            <button
              onClick={() => setShowGuestForm(false)}
              style={{
                background: "transparent", border: "none",
                color: "var(--color-text-muted)", fontFamily: "inherit",
                fontSize: 13, cursor: "pointer", padding: 0, textAlign: "center" as const,
              }}
            >
              ← 뒤로
            </button>
          )}
        </div>

        <div className="bottom-bar">
          <Button block primary onClick={handleStart} disabled={!valid || submitting}>
            {submitting ? "참여 중..." : "참여 시작"}
          </Button>
        </div>
      </div>
    );
  }

  // ── 미로그인 — 로그인 / 비회원 선택 ──
  return (
    <div className="screen">
      <div style={{ padding: "14px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
        <Logo size={24} />
      </div>

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {MeetingInfoCard}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 2 }}>
            어떻게 참여할까요?
          </div>

          {/* 로그인 */}
          <button
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`)}
            style={{
              width: "100%", textAlign: "left",
              background: "var(--color-primary-soft)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: 16, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14,
              fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>
                로그인하고 참여
              </div>
              <div className="t-cap" style={{ marginTop: 3, color: "var(--color-primary)" }}>
                내 모임 목록에서 참여 이력 확인 가능
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-primary)" />
          </button>

          {/* 비회원 */}
          <button
            onClick={() => setShowGuestForm(true)}
            style={{
              width: "100%", textAlign: "left",
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: 16, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14,
              fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                비회원으로 입장
              </div>
              <div className="t-cap" style={{ marginTop: 3 }}>
                닉네임만 입력하면 바로 참여
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </button>
        </div>
      </div>
    </div>
  );
}
