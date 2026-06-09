"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Logo } from "@/components/primitives";
import { Calendar } from "@/components/icons";
import type { InviteVM } from "@/lib/invite";

export function InviteJoinView({ token, vm }: { token: string; vm: InviteVM }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;

  const handleStart = () => {
    if (!valid) return;
    router.push(`/invite/${token}/time-select`);
  };

  return (
    <div className="screen">
      <div style={{ padding: "14px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
        <Logo size={24} />
      </div>

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Meeting info card */}
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

        {/* Nickname input */}
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
          />
          <div className="t-cap">2–12자 · 한글·영문·숫자</div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-2)", textAlign: "center", lineHeight: 1.6 }}>
          닉네임만 입력하면 바로 참여할 수 있어요.<br />회원가입은 필요하지 않아요.
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary onClick={handleStart} disabled={!valid}>
          참여 시작
        </Button>
      </div>
    </div>
  );
}
