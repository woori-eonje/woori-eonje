"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Logo } from "@/components/primitives";
import { Calendar, ChevronRight } from "@/components/icons";
import { ApiError, getToken } from "@/lib/api";
import { getMe } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import type { InviteVM } from "@/lib/invite";
import {
  registerParticipant,
  restoreParticipantSession,
  isValidGuestSession,
  saveParticipant,
  loadParticipant,
} from "@/lib/participant";

const GUEST_NAME_PATTERN = /^[가-힣A-Za-z0-9]+(?: [가-힣A-Za-z0-9]+)*$/;

export function InviteJoinView({ token, vm }: { token: string; vm: InviteVM }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestMode, setGuestMode] = useState<"register" | "restore">("register");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const guestNameValid =
    normalizedName.length >= 2
    && normalizedName.length <= 12
    && GUEST_NAME_PATTERN.test(normalizedName);
  const nameValid = isLoggedIn ? normalizedName.length > 0 : guestNameValid;
  const pinValid = /^\d{4}$/.test(pin);
  const valid =
    nameValid
    && (
      isLoggedIn
      || (pinValid && (guestMode === "restore" || pin === pinConfirm))
    );

  useEffect(() => {
    // 로그인 여부는 localStorage 토큰(클라이언트 전용)이라 렌더 중 읽으면 hydration
    // 불일치가 난다 → 마운트 후 effect 에서 1회 감지. 의도된 동기 setState.
    if (!getToken()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoggedIn(true);
    getMe()
      .then((user) => setName(user.nickname))
      .catch((e) => setError(getApiErrorMessage(e, "회원 정보를 불러오지 못했어요. 페이지를 새로고침해 주세요.")));
  }, []);

  const handleStart = async () => {
    if (!valid || submitting) return;
    if (loadParticipant(token) && guestMode !== "restore") {
      router.push(`/invite/${token}/time-select`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res =
        !isLoggedIn && guestMode === "restore"
          ? await restoreParticipantSession(token, normalizedName, pin)
          : await registerParticipant(
              token,
              normalizedName,
              isLoggedIn,
              !isLoggedIn ? pin : undefined,
            );
      if (!isLoggedIn && !isValidGuestSession(res)) {
        setError("응답 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
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
      // 로그인 참여인데 토큰이 만료/부재면 로그인으로 유도.
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
        router.push(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      if (e instanceof ApiError && e.code === "PARTICIPANT_NICKNAME_TAKEN") {
        setError("이미 사용 중인 닉네임이에요. 기존 응답을 불러오거나 다른 닉네임을 사용해 주세요.");
      } else if (e instanceof ApiError && e.code === "INVALID_PARTICIPANT_CREDENTIALS") {
        setError("닉네임 또는 참여 PIN을 확인해 주세요.");
      } else if (e instanceof ApiError && e.code === "PARTICIPANT_LOGIN_RATE_LIMITED") {
        setError("여러 번 입력이 틀렸어요. 잠시 후 다시 시도해 주세요.");
      } else {
        setError(
          e instanceof ApiError ? e.message : "참여에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
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
            <div
              className="t-cap"
              style={{
                color: name.length > 0 && !guestNameValid
                  ? "var(--color-error)"
                  : "var(--color-text-2)",
              }}
            >
              2–12자 · 한글·영문·숫자·띄어쓰기
            </div>
          </div>

          {!isLoggedIn && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="participant-pin" style={{ fontSize: 13, fontWeight: 700 }}>
                  참여 PIN <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="participant-pin"
                  className="input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="숫자 4자리"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  aria-describedby="participant-pin-help"
                />
                <div id="participant-pin-help" className="t-cap">
                  다른 기기에서 기존 응답을 불러올 때 사용해요.
                </div>
              </div>

              {guestMode === "register" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="participant-pin-confirm" style={{ fontSize: 13, fontWeight: 700 }}>
                    참여 PIN 확인
                  </label>
                  <input
                    id="participant-pin-confirm"
                    className="input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="한 번 더 입력해 주세요"
                    value={pinConfirm}
                    onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={(event) => event.key === "Enter" && handleStart()}
                    maxLength={4}
                  />
                  {pinConfirm.length === 4 && pin !== pinConfirm && (
                    <div className="t-cap" style={{ color: "var(--color-error)", fontWeight: 600 }}>
                      참여 PIN이 서로 달라요.
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setGuestMode((current) => current === "register" ? "restore" : "register");
                  setPin("");
                  setPinConfirm("");
                  setError(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-primary)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "center",
                }}
              >
                {guestMode === "register"
                  ? "이미 참여했나요? 기존 응답 불러오기"
                  : "처음 참여하시나요? 새로 참여하기"}
              </button>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="t-cap"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--color-error-soft)",
                color: "var(--color-error)",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {!isLoggedIn && (
            <button
              onClick={() => {
                setShowGuestForm(false);
                setGuestMode("register");
                setPin("");
                setPinConfirm("");
                setError(null);
              }}
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
            {submitting
              ? (guestMode === "restore" ? "불러오는 중..." : "참여 중...")
              : (guestMode === "restore" ? "기존 응답 불러오기" : "참여 시작")}
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
            onClick={() => {
              setGuestMode("register");
              setShowGuestForm(true);
            }}
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
                닉네임과 참여 PIN으로 참여
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </button>
        </div>
      </div>
    </div>
  );
}
