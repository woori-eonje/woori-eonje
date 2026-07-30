"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/primitives";
import { ApiError } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedEmail = email.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(normalizedEmail);

  const handleSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(normalizedEmail);
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
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
          {submitted ? (
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
                <h1 className="t-h2" style={{ marginBottom: 6 }}>메일을 확인해 주세요</h1>
                <p className="t-body2">
                  가입된 이메일이라면 비밀번호를 다시 설정할 수 있는 링크를 보냈어요.
                </p>
              </div>
              <div
                className="t-body2"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--color-bg-2)",
                  color: "var(--color-text-2)",
                }}
              >
                메일이 보이지 않으면 스팸함을 확인하거나 잠시 후 다시 요청해 주세요.
              </div>
              <button
                type="button"
                className="btn secondary block"
                onClick={() => {
                  setSubmitted(false);
                  setError(null);
                }}
              >
                다시 요청하기
              </button>
            </>
          ) : (
            <>
              <div>
                <h1 className="t-h2" style={{ marginBottom: 6 }}>비밀번호를 잊으셨나요?</h1>
                <p className="t-body2">
                  가입할 때 사용한 이메일로 재설정 링크를 보내드릴게요.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="reset-email" style={{ fontSize: 13, fontWeight: 700 }}>
                  이메일
                </label>
                <input
                  id="reset-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
                  aria-invalid={email.length > 0 && !valid}
                  aria-describedby="reset-email-help"
                  autoFocus
                />
                <p
                  id="reset-email-help"
                  className="t-cap"
                  style={{
                    color: email.length > 0 && !valid
                      ? "var(--color-error)"
                      : "var(--color-text-2)",
                  }}
                >
                  이메일 형식으로 입력해 주세요.
                </p>
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
                {loading ? "보내는 중..." : "재설정 링크 받기"}
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
