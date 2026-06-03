"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Button } from "@/components/primitives";
import { ChevronRight, Check } from "@/components/icons";
import { StatRow } from "@/components/meeting/StatRow";
import { ParticipantRow } from "@/components/meeting/ParticipantRow";
import type { Recommendation } from "@/types/meeting";

const RECS: Recommendation[] = [
  {
    rank: 1, when: "6.8 (토) 오후 2:00 – 4:00", dateLabel: "6월 8일 토요일", time: "오후 2:00 – 4:00",
    availableCount: 5, maybeCount: 1, unavailableCount: 0, requiredSatisfied: true,
    participants: [
      { name: "소미", status: "available", required: true },
      { name: "지현", status: "available", required: true },
      { name: "민수", status: "available" },
      { name: "유나", status: "available" },
      { name: "태오", status: "available" },
      { name: "하린", status: "maybe" },
    ],
  },
  { rank: 2, when: "6.6 (목) 오후 7:00 – 9:00",  availableCount: 4, maybeCount: 1, unavailableCount: 1, requiredSatisfied: false, note: "필수 1명 애매", dateLabel: "", time: "" },
  { rank: 3, when: "6.10 (월) 오후 8:00 – 10:00", availableCount: 3, maybeCount: 2, unavailableCount: 0, requiredSatisfied: true,  dateLabel: "", time: "" },
  { rank: 4, when: "6.7 (일) 오후 3:00 – 5:00",   availableCount: 3, maybeCount: 1, unavailableCount: 2, requiredSatisfied: false, note: "필수 1명 불가", dateLabel: "", time: "" },
  { rank: 5, when: "6.5 (금) 오후 9:00 – 11:00",  availableCount: 3, maybeCount: 0, unavailableCount: 3, requiredSatisfied: true,  dateLabel: "", time: "" },
];

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

        {/* Hero */}
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

          <StatRow ok={top.availableCount} m={top.maybeCount} x={top.unavailableCount} emphasized />

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
            block primary
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
                  <StatRow ok={r.availableCount} m={r.maybeCount} x={r.unavailableCount} />
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
