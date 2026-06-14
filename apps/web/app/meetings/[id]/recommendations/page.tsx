"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { TopBar, Button } from "@/components/primitives";
import { ChevronRight, Check } from "@/components/icons";
import { StatRow } from "@/components/meeting/StatRow";
import { getRecommendations, confirmMeeting } from "@/lib/meetings";
import { ApiError, getToken } from "@/lib/api";
import type { Recommendation } from "@whenwe/types";

const TZ = "Asia/Seoul";

function formatDateLabel(iso: string) {
  return formatInTimeZone(iso, TZ, "M월 d일 EEEE", { locale: ko });
}
function formatTimeRange(startIso: string, endIso: string) {
  const s = formatInTimeZone(startIso, TZ, "a h:mm", { locale: ko });
  const e = formatInTimeZone(endIso, TZ, "h:mm");
  return `${s} – ${e}`;
}
function formatWhen(startIso: string, endIso: string) {
  const date = formatInTimeZone(startIso, TZ, "M.d (EEE)", { locale: ko });
  return `${date} ${formatTimeRange(startIso, endIso)}`;
}

export default function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`); return; }
    getRecommendations(Number(id))
      .then((res) => setRecs(res.recommendations))
      .catch((e) => setError(e instanceof ApiError ? e.message : "추천 결과를 불러올 수 없어요."))
      .finally(() => setLoading(false));
  }, [id, router]);

  const top = recs[0];

  const handleConfirm = async () => {
    if (!top) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmMeeting(Number(id), top.recommendationId);
      router.push(`/meetings/${id}/confirmed`);
    } catch (e) {
      setConfirmError(e instanceof ApiError ? e.message : "확정 중 오류가 생겼어요.");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="추천 결과" onBack={() => router.back()} />
        <div className="scroll" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="skeleton" style={{ height: 40, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  if (error || !top) {
    return (
      <div className="screen">
        <TopBar title="추천 결과" onBack={() => router.back()} />
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <p className="t-body2" style={{ marginBottom: 12 }}>{error ?? "추천 결과가 없어요."}</p>
        </div>
      </div>
    );
  }

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
            <div className="t-cap" style={{ color: "var(--color-text-2)" }}>{formatDateLabel(top.startAt)}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.035em" }}>{formatTimeRange(top.startAt, top.endAt)}</h3>
          </div>

          <StatRow ok={top.availableCount} m={top.maybeCount} x={top.unavailableCount} emphasized />

          {top.requiredParticipantSatisfied && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
              background: "var(--color-primary-soft)", color: "var(--color-primary)",
              padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            }}>
              <Check size={14} color="var(--color-primary)" stroke={2.5} />
              필수 참석자 모두 가능
            </div>
          )}

          {confirmError && (
            <p style={{ fontSize: 13, color: "var(--color-accent)", margin: 0 }}>{confirmError}</p>
          )}

          <Button
            block primary
            disabled={confirming}
            onClick={handleConfirm}
            leftIcon={<Check size={18} color="#fff" stroke={2.5} />}
          >
            {confirming ? "확정 중…" : "이 시간으로 확정"}
          </Button>
        </div>

        {/* Other ranks */}
        {recs.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 className="t-h3" style={{ paddingLeft: 4 }}>다른 추천 시간</h3>
            {recs.slice(1).map((r) => (
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
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{formatWhen(r.startAt, r.endAt)}</div>
                  <div style={{ marginTop: 2 }}>
                    <StatRow ok={r.availableCount} m={r.maybeCount} x={r.unavailableCount} />
                  </div>
                </div>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
