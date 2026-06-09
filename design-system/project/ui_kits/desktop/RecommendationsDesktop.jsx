/* RecommendationsDesktop.jsx — Wide desktop layout for the
   recommendations screen. Left: rank list + 1순위 detail.
   Right: meeting summary + final action. */

const { useState: useRDState } = React;

const ALL_RECS = [
  {
    rank: 1, when: "6.8 (토) 오후 2:00 – 4:00",
    dayLabel: "6월 8일 토요일", timeLabel: "오후 2:00 – 4:00",
    ok: 5, m: 1, x: 0, reqOk: true,
    participants: [
      { name: "소미", state: "available", req: true },
      { name: "지현", state: "available", req: true },
      { name: "민수", state: "available", req: false },
      { name: "유나", state: "available", req: false },
      { name: "태오", state: "available", req: false },
      { name: "하린", state: "maybe",     req: false },
    ],
  },
  {
    rank: 2, when: "6.6 (목) 오후 7:00 – 9:00",
    dayLabel: "6월 6일 목요일", timeLabel: "오후 7:00 – 9:00",
    ok: 4, m: 1, x: 1, reqOk: false, note: "필수 1명 애매",
    participants: [
      { name: "소미", state: "available", req: true },
      { name: "지현", state: "maybe",     req: true },
      { name: "민수", state: "available", req: false },
      { name: "유나", state: "available", req: false },
      { name: "태오", state: "available", req: false },
      { name: "하린", state: "unavail",   req: false },
    ],
  },
  {
    rank: 3, when: "6.10 (월) 오후 8:00 – 10:00",
    dayLabel: "6월 10일 월요일", timeLabel: "오후 8:00 – 10:00",
    ok: 3, m: 2, x: 0, reqOk: true,
    participants: [
      { name: "소미", state: "available", req: true },
      { name: "지현", state: "available", req: true },
      { name: "민수", state: "maybe",     req: false },
      { name: "유나", state: "available", req: false },
      { name: "태오", state: "maybe",     req: false },
      { name: "하린", state: "available", req: false },
    ],
  },
  {
    rank: 4, when: "6.7 (일) 오후 3:00 – 5:00",
    dayLabel: "6월 7일 일요일", timeLabel: "오후 3:00 – 5:00",
    ok: 3, m: 1, x: 2, reqOk: false, note: "필수 1명 불가",
    participants: [],
  },
  {
    rank: 5, when: "6.5 (금) 오후 9:00 – 11:00",
    dayLabel: "6월 5일 금요일", timeLabel: "오후 9:00 – 11:00",
    ok: 3, m: 0, x: 3, reqOk: true,
    participants: [],
  },
];

function StateChip({ state }) {
  const map = {
    available: { cls: "ok",    label: "가능", glyph: <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-primary)" }} /> },
    maybe:     { cls: "maybe", label: "애매", glyph: <span style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "8px solid var(--color-maybe)" }} /> },
    unavail:   { cls: "gray",  label: "불가", glyph: <span style={{ width: 10, height: 2, background: "var(--color-text-muted)" }} /> },
  };
  const s = map[state] || map.unavail;
  return <span className={`pill ${s.cls}`} style={{ height: 24, fontSize: 11, padding: "0 8px" }}>
    {s.glyph} {s.label}
  </span>;
}

function StatBlock({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: "12px 14px", background: "var(--color-bg)", borderRadius: 12, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", letterSpacing: "-0.005em" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.025em", color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function RankRow({ r, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rank-row"
      data-active={active ? "true" : "false"}
      style={{
        width: "100%", textAlign: "left",
        background: active ? "var(--color-primary-soft)" : "var(--color-surface)",
        border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
        borderRadius: 16, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 14,
        fontFamily: "inherit", cursor: "pointer",
        transition: "background 160ms, border-color 160ms, transform 120ms",
      }}>
      <span style={{
        background: r.rank === 1 ? "var(--color-primary)" : "var(--color-bg-2)",
        color: r.rank === 1 ? "#fff" : "var(--color-text-2)",
        fontSize: 12, fontWeight: 800,
        padding: "5px 10px", borderRadius: 999,
        letterSpacing: "-0.005em", flex: "none",
      }}>{r.rank}순위</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{r.when}</div>
        <div style={{ fontSize: 12, marginTop: 3, color: "var(--color-text-2)" }}>
          <b style={{ color: "var(--color-primary)" }}>가능 {r.ok}</b> · <span style={{ color: "var(--color-maybe-text)" }}>애매 {r.m}</span> · <span style={{ color: "var(--color-text-muted)" }}>불가 {r.x}</span>
          {r.note && <span style={{ color: "var(--color-maybe-text)", marginLeft: 6 }}>· {r.note}</span>}
        </div>
      </div>
      {r.reqOk && <span className="pill ok" style={{ height: 24, padding: "0 10px", fontSize: 12 }}>필수 OK</span>}
      <span aria-hidden="true" className="rank-row-chev" style={{ color: "var(--color-text-muted)", fontSize: 16, transition: "transform 160ms, color 160ms" }}>›</span>
    </button>
  );
}

function RecommendationsDesktop() {
  const [selected, setSelected] = useRDState(1);
  const rec = ALL_RECS.find(r => r.rank === selected);

  return (
    <div className="split" style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}>
      {/* LEFT — rank list + detail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Hero — emphasis comes from layout & typography, not Forest fills */}
        <div className="card emphasis" style={{ position: "relative", display: "flex", gap: 28, padding: 32, alignItems: "stretch" }}>
          <span style={{
            position: "absolute", top: -12, left: 24,
            background: "var(--color-primary)", color: "#fff",
            fontSize: 12, fontWeight: 800, padding: "5px 12px",
            borderRadius: 999, letterSpacing: "-0.005em",
          }}>{rec.rank}순위{rec.rank === 1 ? " · 가장 잘 맞는 시간" : ""}</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-2)", letterSpacing: "-0.015em" }}>{rec.dayLabel}</div>
            <h2 style={{ margin: "6px 0 0", fontSize: 36, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.15 }}>{rec.timeLabel}</h2>

            {/* A sentence, not a dashboard. */}
            <div style={{ marginTop: 18, fontSize: 16, lineHeight: 1.6, letterSpacing: "-0.015em", color: "var(--color-text)" }}>
              이 시간엔 <b style={{ color: "var(--color-primary)" }}>{rec.ok}명이 가능</b>
              {rec.m > 0 && <>, <b style={{ color: "var(--color-maybe-text)" }}>{rec.m}명은 애매</b></>}
              {rec.x > 0 && <>, <b style={{ color: "var(--color-text-muted)" }}>{rec.x}명은 불가</b></>}
              <span style={{ color: "var(--color-text-2)" }}>{rec.x === 0 ? "예요." : "."}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              {rec.reqOk ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 10,
                  background: "var(--color-primary-soft)", color: "var(--color-primary)",
                  fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  <Icons.Check size={14} color="var(--color-primary)" stroke={2.5} />
                  필수 참석자 모두 가능
                </span>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 10,
                  background: "var(--color-maybe-soft)", color: "var(--color-maybe-text)",
                  fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                }}>※ {rec.note}</span>
              )}
            </div>
          </div>

          {/* Participants column */}
          {rec.participants.length > 0 && (
            <div style={{ width: 230, flex: "none", borderLeft: "1px solid var(--color-line)", paddingLeft: 28 }}>
              <div className="section-title">참여자 응답</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rec.participants.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      position: "relative",
                      width: 24, height: 24, borderRadius: 999,
                      background: "var(--color-bg-2)", color: "var(--color-text-2)",
                      fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flex: "none",
                    }}>
                      {p.name[0]}
                      {p.req && (
                        <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: "var(--color-accent)", border: "1.5px solid #fff" }} />
                      )}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                      {p.name}
                      {p.req && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-accent)", marginLeft: 5 }}>필수</span>}
                    </span>
                    <StateChip state={p.state} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Other ranks */}
        <div>
          <div className="section-title">다른 추천 시간</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ALL_RECS.map(r => (
              <RankRow key={r.rank} r={r} active={selected === r.rank} onClick={() => setSelected(r.rank)} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — meeting summary + final action */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card tight" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 22, position: "relative", overflow: "hidden" }}>
          {/* tiny Forest accent stripe — quiet emphasis */}
          <span style={{ position: "absolute", left: 0, top: 18, bottom: 18, width: 3, borderRadius: 3, background: "var(--color-primary)" }} />
          <div className="t-cap" style={{ fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: 0.06 }}>이 시간으로</div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em" }}>{rec.timeLabel}</h3>
          <div className="t-cap" style={{ marginBottom: 6 }}>{rec.dayLabel}</div>
          <button className="btn primary block lg">
            <Icons.Check size={18} color="#fff" stroke={2.5} /> 이 시간으로 확정
          </button>
          <button className="btn ghost" style={{ alignSelf: "center", height: 36, padding: "0 12px", color: "var(--color-text-2)", fontSize: 13 }}>조건 다시 검토</button>
        </div>

        <div className="card tight" style={{ position: "relative", overflow: "hidden", padding: 22 }}>
          <span style={{ position: "absolute", top: -20, right: -16, width: 70, height: 70, borderRadius: 999, background: "var(--color-lavender)", opacity: 0.5 }} />
          <div className="section-title">모임 정보</div>
          <h3 className="t-h3" style={{ marginBottom: 8 }}>6월 전시 모임</h3>
          <div className="t-body2" style={{ marginBottom: 14 }}>6월 초에 전시 보러 갈 사람들 일정 조율</div>
          <div className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <div className="t-cap">조율 기간</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>6.1 — 6.14</div>
            </div>
            <div>
              <div className="t-cap">예상 소요</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>2시간</div>
            </div>
            <div>
              <div className="t-cap">응답</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: "var(--color-primary)" }}>5/6명</div>
            </div>
            <div>
              <div className="t-cap">응답 마감</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>5.30 (금)</div>
            </div>
          </div>
        </div>

        <div className="card tight" style={{ padding: 22 }}>
          <div className="section-title">필수 참석자</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["소미", "지현"].map(p => (
              <span key={p} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px",
                background: "var(--color-accent-soft)", color: "var(--color-accent)",
                borderRadius: 999, fontSize: 12, fontWeight: 800,
              }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: "var(--color-accent)", color: "#fff", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{p[0]}</span>
                {p}
              </span>
            ))}
          </div>
          <div className="t-cap" style={{ marginTop: 12 }}>필수 참석자가 모두 가능한 시간을 우선해서 추천해요.</div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { RecommendationsDesktop });
