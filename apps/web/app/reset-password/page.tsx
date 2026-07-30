"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/primitives";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="screen white" style={{ background: "var(--color-bg)" }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get("token")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8 && password.length <= 72;
  const passwordsMatch = password === passwordConfirm;
  const valid = Boolean(token) && passwordValid && passwordsMatch;

  useEffect(() => {
    // 재설정 토큰이 브라우저 방문 기록이나 클라이언트 분석 이벤트에 오래 남지 않도록
    // 최초 렌더 직후 주소창에서 제거한다. 실제 검증에는 메모리에 보관한 값을 사용한다.
    if (searchParams.has("token")) {
      router.replace("/reset-password", { scroll: false });
    }
  }, [router, searchParams]);

  const handleSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setCompleted(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === "PASSWORD_RESET_TOKEN_INVALID") {
        setError("유효하지 않거나 만료된 링크예요. 재설정 링크를 다시 받아 주세요.");
      } else {
        setError(
          e instanceof ApiError
            ? e.message
            : "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen white" style={{ background: "var(--color-bg)" }}>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <Logo size={36} />
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 440,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {!token ? (
            <>
              <div>
                <h1 className="t-h2" style={{ marginBottom: 6 }}>링크를 확인해 주세요</h1>
                <p className="t-body2">
                  비밀번호 재설정 정보가 없어요. 이메일로 받은 링크를 다시 열어 주세요.
                </p>
              </div>
              <Link className="btn primary block" href="/forgot-password">
                재설정 링크 다시 받기
              </Link>
            </>
          ) : completed ? (
            <>
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                ✓
              </div>
              <div>
                <h1 className="t-h2" style={{ marginBottom: 6 }}>비밀번호를 바꿨어요</h1>
                <p className="t-body2">새 비밀번호로 로그인해 주세요.</p>
              </div>
              <button
                type="button"
                className="btn primary block"
                onClick={() => router.replace("/login")}
              >
                로그인하기
              </button>
            </>
          ) : (
            <>
              <div>
                <h1 className="t-h2" style={{ marginBottom: 6 }}>새 비밀번호 설정</h1>
                <p className="t-body2">앞으로 로그인할 때 사용할 비밀번호를 입력해 주세요.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="new-password" style={{ fontSize: 13, fontWeight: 700 }}>
                  새 비밀번호
                </label>
                <input
                  id="new-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8자 이상"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoFocus
                />
                <p
                  className="t-cap"
                  style={{
                    color: password.length > 0 && !passwordValid
                      ? "var(--color-error)"
                      : "var(--color-text-2)",
                  }}
                >
                  8~72자로 입력해 주세요.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="new-password-confirm" style={{ fontSize: 13, fontWeight: 700 }}>
                  새 비밀번호 확인
                </label>
                <input
                  id="new-password-confirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="한 번 더 입력해 주세요"
                  maxLength={72}
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
                />
                {passwordConfirm.length > 0 && !passwordsMatch && (
                  <p className="t-cap" style={{ color: "var(--color-error)" }}>
                    비밀번호가 서로 달라요.
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    background: "var(--color-error-soft)",
                    color: "var(--color-error)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                className="btn primary block"
                disabled={!valid || loading}
                onClick={handleSubmit}
              >
                {loading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            href="/login"
            style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            ← 로그인으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
