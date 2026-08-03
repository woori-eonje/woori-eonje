"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TopBar } from "@/components/primitives";
import { ApiError, getToken } from "@/lib/api";
import { getMe, withdraw } from "@/lib/auth";
import type { AuthUser } from "@whenwe/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?redirect=/settings");
      return;
    }
    getMe().then(setUser).catch(() => router.replace("/login?redirect=/settings"));
  }, [router]);

  const handleWithdraw = async () => {
    if (!password || !confirmed || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await withdraw(password);
      router.replace("/");
    } catch (e) {
      if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") {
        setError("비밀번호가 올바르지 않아요.");
      } else {
        setError(e instanceof ApiError ? e.message : "회원 탈퇴를 처리하지 못했어요.");
      }
      setDeleting(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="계정 설정" onBack={() => router.push("/meetings")} />
      <main className="scroll" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <section className="card tight">
          <div className="t-cap" style={{ fontWeight: 800, marginBottom: 8 }}>내 계정</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{user?.nickname ?? "불러오는 중…"}</div>
          <div className="t-body2" style={{ marginTop: 2 }}>{user?.email ?? ""}</div>
        </section>

        <section className="card" style={{ borderColor: "#FCA5A5" }}>
          <h2 className="t-h3" style={{ color: "var(--color-error)" }}>회원 탈퇴</h2>
          <p className="t-body2" style={{ marginTop: 8 }}>
            내가 만든 모임과 해당 모임의 모든 응답이 삭제됩니다. 다른 모임에 제출한 응답은 유지되지만 더 이상 수정할 수 없어요.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            <label htmlFor="withdraw-password" style={{ fontSize: 13, fontWeight: 700 }}>현재 비밀번호</label>
            <input id="withdraw-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="현재 비밀번호를 입력해 주세요" />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 4, accentColor: "var(--color-error)" }} />
            <span className="t-body2">삭제되는 내용을 확인했으며 탈퇴에 동의합니다.</span>
          </label>
          {error && <p role="alert" className="t-cap" style={{ color: "var(--color-error)", marginTop: 12, fontWeight: 700 }}>{error}</p>}
          <Button block danger disabled={!password || !confirmed || deleting} onClick={handleWithdraw} style={{ marginTop: 18 }}>
            {deleting ? "탈퇴 처리 중…" : "회원 탈퇴"}
          </Button>
        </section>
      </main>
    </div>
  );
}
