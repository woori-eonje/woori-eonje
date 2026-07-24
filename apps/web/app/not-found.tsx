import Link from "next/link";
import {
  BrandDecorBabyBlue,
  BrandDecorForest,
  BrandDecorPoppy,
  Logo,
} from "@/components/primitives";

export default function NotFound() {
  return (
    <main className="screen white" style={{ background: "var(--color-bg)" }}>
      <header style={{ padding: "14px 20px" }}>
        <Link
          href="/"
          aria-label="우리 언제? 홈으로"
          style={{ display: "inline-block" }}
        >
          <Logo size={28} />
        </Link>
      </header>

      <div
        className="scroll center"
        style={{
          position: "relative",
          flexDirection: "column",
          padding: "32px 20px 80px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: 180,
            height: 132,
            marginBottom: 28,
          }}
        >
          <BrandDecorBabyBlue
            style={{ position: "absolute", top: 12, left: 8 }}
          />
          <BrandDecorPoppy
            style={{ position: "absolute", top: 4, right: 18 }}
          />
          <BrandDecorForest
            style={{
              position: "absolute",
              width: 112,
              height: 84,
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "50%",
              bottom: 24,
              transform: "translateX(-50%)",
              color: "#fff",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.04em",
            }}
          ></span>
        </div>

        <h1 className="t-h1">페이지를 찾을 수 없어요</h1>
        <p
          className="t-body"
          style={{
            color: "var(--color-text-2)",
            marginTop: 10,
            maxWidth: 300,
          }}
        >
          주소가 잘못되었거나 페이지가 이동했을 수 있어요.
          <br />
          아래에서 다시 시작해 주세요.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            marginTop: 28,
          }}
        >
          <Link href="/" className="btn primary block">
            홈으로 가기
          </Link>
          <Link href="/meetings" className="btn outline block">
            내 모임 보기
          </Link>
        </div>
      </div>
    </main>
  );
}
