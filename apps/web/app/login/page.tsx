"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const valid = email.includes("@") && password.length >= 6;

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
              <input className="input" placeholder="이름을 입력해주세요" />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>이메일</label>
            <input
              className="input" type="email" placeholder="example@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>비밀번호</label>
            <input
              className="input" type="password" placeholder="6자 이상"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className={`btn primary block ${!valid ? "opacity-50" : ""}`}
            disabled={!valid}
            onClick={() => router.push("/meetings")}
          >
            {isSignup ? "가입하기" : "로그인"}
          </button>

          <button
            onClick={() => setIsSignup((s) => !s)}
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
