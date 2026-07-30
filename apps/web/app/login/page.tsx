"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/primitives";
import { login, signup } from "@/lib/auth";
import { ApiError, getToken } from "@/lib/api";

// useSearchParams 는 정적 프리렌더 시 Suspense 경계가 필요하다(Next 빌드 요구).
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="screen white" style={{ background: "var(--color-bg)" }} />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/meetings";

  useEffect(() => {
    if (getToken()) router.replace(redirect);
  }, [redirect, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isSignup
    ? email.includes("@") && password.length >= 8 && nickname.trim().length >= 1
    : email.includes("@") && password.length >= 8;

  const handleSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignup) {
        await signup(email, password, nickname.trim());
        // 가입 후 자동 로그인
        await login(email, password);
      } else {
        await login(email, password);
      }
      router.push(redirect);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "EMAIL_ALREADY_EXISTS") {
          setError("이미 사용 중인 이메일이에요.");
        } else if (e.code === "INVALID_CREDENTIALS") {
          setError("이메일 또는 비밀번호가 맞지 않아요.");
        } else {
          setError(e.message);
        }
      } else {
        setError("잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen white" style={{ background: "var(--color-bg)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 20px" }}>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <Logo size={36} />
        </div>

        {/* Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 440, margin: "0 auto", width: "100%" }}>
          <div>
            <h2 className="t-h2" style={{ marginBottom: 4 }}>
              {isSignup ? "회원가입" : "로그인"}
            </h2>
            <p className="t-body2">
              {isSignup
                ? "모임을 만들려면 계정이 필요해요."
                : "모임 만들기는 로그인이 필요해요."}
            </p>
          </div>

          {isSignup && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>이름 (닉네임)</label>
              <input
                className="input"
                placeholder="이름을 입력해주세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>이메일</label>
            <input
              className="input" type="email" placeholder="example@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>비밀번호</label>
              {!isSignup && (
                <Link
                  href="/forgot-password"
                  style={{
                    color: "var(--color-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  비밀번호를 잊으셨나요?
                </Link>
              )}
            </div>
            <input
              className="input" type="password" placeholder="8자 이상"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <div style={{
              background: "var(--color-accent-soft)", color: "var(--color-accent)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            className={`btn primary block ${(!valid || loading) ? "opacity-50" : ""}`}
            disabled={!valid || loading}
            onClick={handleSubmit}
          >
            {loading ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
          </button>

          <button
            onClick={() => { setIsSignup((s) => !s); setError(null); }}
            style={{
              background: "transparent", border: "none",
              color: "var(--color-text-2)", fontFamily: "inherit",
              fontSize: 13, cursor: "pointer", padding: 0, textAlign: "center" as const,
            }}
          >
            {isSignup ? "이미 계정이 있어요 → 로그인" : "계정이 없어요 → 회원가입"}
          </button>
        </div>

        <div style={{ textAlign: "center" as const, marginTop: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}>
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
