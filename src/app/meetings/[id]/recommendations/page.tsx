"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { ChevronRight, Check } from "@/components/icons";

type AvailStatus = "available" | "maybe" | "unavail" | "pending";

interface Participant {
  name: string;
  status: AvailStatus;
  required?: boolean;
}

interface Rec {
  rank: number;
  when: string;
  dateLabel: string;
  time: string;
  ok: number;
  m: number;
  x: number;
  reqOk: boolean;
  note?: string;
  participants?: Participant[];
}

const RECS: Rec[] = [
  {
    rank: 1, when: "6.8 (토) 오후 2:00 – 4:00", dateLabel: "6월 8일 토요일", time: "오후 2:00 – 4:00",
    ok: 5, m: 1, x: 0, reqOk: true,
    participants: [
      { name: "소미", status: "available", required: true },
      { name: "지현", status: "available", required: true },
      { name: "민수", status: "available" },
      { name: "유나", status: "available" },
      { name: "태오", status: "available" },
      { name: "하린", status: "maybe" },
    ],
  },
  { rank: 2, when: "6.6 (목) 오후 7:00 – 9:00",  ok: 4, m: 1, x: 1, reqOk: false, note: "필수 1명 애매", dateLabel: "", time: "" },
  { rank: 3, when: "6.10 (월) 오후 8:00 – 10:00", ok: 3, m: 2, x: 0, reqOk: true,  dateLabel: "", time: "" },
  { rank: 4, when: "6.7 (일) 오후 3:00 – 5:00",   ok: 3, m: 1, x: 2, reqOk: false, note: "필수 1명 불가", dateLabel: "", time: "" },
  { rank: 5, when: "6.5 (금) 오후 9:00 – 11:00",  ok: 3, m: 0, x: 3, reqOk: true,  dateLabel: "", time: "" },
];

function StatRow({ ok, m, x, emphasized }: { ok: number; m: number; x: number; emphasized?: boolean }) {
  const numStyle = emphasized ? { fontSize: 15, fontWeight: 800 } : { fontSize: 13, fontWeight: 700 };
  return (
    <div style={{ display: "flex", gap: 14, color: "var(--color-text-2)", flexWrap: "wrap" as const, alignItems: "baseline" }}>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-primary)", display: "inline-block", transform: "translateY(-1px)" }} />
        <b style={{ color: "var(--color-primary)", ...numStyle }}>{ok}</b>
        <span style={{ color: "var(--color-primary)", fontSize: 12, fontWeight: 600 }}>가능</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "8px solid var(--color-maybe)", display: "inline-block", transform: "translateY(-1px)" }} />
        <b style={{ color: "var(--color-maybe-text)", ...numStyle }}>{m}</b>
        <span style={{ color: "var(--color-maybe-text)", fontSize: 12, fontWeight: 600 }}>애매</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" as const }}>
        <span style={{ width: 10, height: 2, background: "var(--color-text-muted)", display: "inline-block", transform: "translateY(-3px)" }} />
        <b style={{ color: "var(--color-text-muted)", ...numStyle }}>{x}</b>
        <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600 }}>불가</span>
      </span>
    </div>
  );
}

function ParticipantRow({ name, status, required }: Participant) {
  const cls = status === "available" ? "ok" : status === "maybe" ? "maybe" : "gray";
  const lbl = status === "available" ? "가능" : status === "maybe" ? "애매" : status === "unavail" ? "불가" : "응답 대기";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <span style={{
        position: "relative",
        width: 24, height: 24, borderRadius: 999,
        background: "var(--color-bg-2)", color: "var(--color-text-2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flex: "none",
      }}>
        {name.slice(0, 1)}
        {required && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 8, height: 8, borderRadius: 999,
            background: "var(--color-accent)",
            border: "1.5px solid var(--color-surface)",
          }} aria-label="필수 참석자" />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {name}
          {required && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-accent)" }}>필수</span>}
        </span>
      </div>
      <span className={`pill ${cls}`} style={{ height: 22, fontSize: 11, padding: "0 8px" }}>{lbl}</span>
    </div>
  );
}

export default function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const top = RECS[0];

  return (
    <div className="screen">
      <TopBar
        title="추천 결과"
        onBack={() => router.back()}
        right={<span className="pill maybe" style={{ marginRight: 12 }}>확정 필요</span>}
      />

      <div className="scroll" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero heading */}
        <div>
          <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>5/6명 응답</div>
          <h2 className="t-h1" style={{ marginTop: 4 }}>가장 잘 맞는 시간을<br />찾았어요</h2>
          <p className="t-body2" style={{ marginTop: 6 }}>
            1순위로 확정하거나, 다른 시간도 함께 확인해보세요.
          </p>
        </div>

        {/* 1순위 card */}
        <div className="card emphasis" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <span style={{
            position: "absolute", top: -12, left: 20,
            background: "var(--color-primary)", color: "#fff",
            fontSize: 12, fontWeight: 800, padding: "5px 12px",
            borderRadius: 999, letterSpacing: "-0.01em",
          }}>
            1순위
          </span>

          <div>
            <div className="t-cap" style={{ color: "var(--color-text-2)" }}>{top.dateLabel}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.035em" }}>{top.time}</h3>
          </div>

          <StatRow ok={top.ok} m={top.m} x={top.x} emphasized />

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
            background: "var(--color-primary-soft)", color: "var(--color-primary)",
            padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          }}>
            <Check size={14} color="var(--color-primary)" stroke={2.5} />
            필수 참석자 모두 가능
          </div>

          <div className="dashed-divider" />

          <div>
            <div className="t-cap" style={{ color: "var(--color-text-2)", marginBottom: 4 }}>참여자별 응답</div>
            {top.participants?.map((p) => <ParticipantRow key={p.name} {...p} />)}
          </div>

          <Button
            block
            primary
            onClick={() => router.push(`/meetings/${id}/confirmed`)}
            leftIcon={<Check size={18} color="#fff" stroke={2.5} />}
          >
            이 시간으로 확정
          </Button>
        </div>

        {/* Other ranks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 className="t-h3" style={{ paddingLeft: 4 }}>다른 추천 시간</h3>
          {RECS.slice(1).map((r) => (
            <div key={r.rank} style={{
              background: "#fff", border: "1px solid var(--color-line)",
              borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}>
              <span style={{
                background: "var(--color-bg-2)", color: "var(--color-text-2)",
                fontSize: 12, fontWeight: 800, padding: "5px 12px",
                borderRadius: 999, letterSpacing: "-0.01em", flex: "none",
              }}>
                {r.rank}순위
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{r.when}</div>
                <div style={{ marginTop: 2 }}>
                  <StatRow ok={r.ok} m={r.m} x={r.x} />
                </div>
                {r.note && (
                  <div className="t-cap" style={{ color: "var(--color-maybe-text)", marginTop: 4 }}>※ {r.note}</div>
                )}
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
