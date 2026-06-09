/* TimeAggregate.jsx — Desktop host view: aggregate heatmap of all
   participants' selections. Read-only for the host. */

const { useMemo: useTAMemo, useState: useTAState } = React;

const DAYS = [
  { id: "6.4", label: "6.4", weekday: "목" },
  { id: "6.5", label: "6.5", weekday: "금" },
  { id: "6.6", label: "6.6", weekday: "토" },
  { id: "6.7", label: "6.7", weekday: "일" },
  { id: "6.8", label: "6.8", weekday: "월" },
  { id: "6.9", label: "6.9", weekday: "화" },
  { id: "6.10",label: "6.10",weekday: "수" },
];

const HOURS = [
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00", "22:30", "23:00",
];

const TOTAL = 6;

/* Pre-cooked aggregate data: per (day, time) → { ok, m } counts.
   Keep deterministic so the screenshot is stable. */
function buildAgg() {
  // Hand-tuned to show a 1순위 hotspot on 6.8 토 14:00 era — for the
  // recommendations view. Here we focus on evening hours: 6.6 19:00, 6.8 20:00.
  const agg = {};
  for (const d of DAYS) {
    for (const h of HOURS) {
      agg[`${d.id}_${h}`] = { ok: 0, m: 0 };
    }
  }
  const set = (d, h, ok, m) => agg[`${d}_${h}`] = { ok, m };

  // 6.4 목
  set("6.4", "19:00", 3, 1); set("6.4", "19:30", 4, 1); set("6.4", "20:00", 4, 0);
  set("6.4", "20:30", 3, 1); set("6.4", "21:00", 2, 1);

  // 6.5 금
  set("6.5", "19:00", 2, 1); set("6.5", "19:30", 3, 1); set("6.5", "20:00", 3, 2);
  set("6.5", "21:00", 2, 0);

  // 6.6 토 — hotspot
  set("6.6", "18:30", 4, 1); set("6.6", "19:00", 5, 1); set("6.6", "19:30", 5, 1);
  set("6.6", "20:00", 5, 0); set("6.6", "20:30", 4, 1); set("6.6", "21:00", 3, 1);

  // 6.7 일
  set("6.7", "18:00", 2, 0); set("6.7", "19:00", 3, 1); set("6.7", "19:30", 4, 0);
  set("6.7", "20:00", 4, 1); set("6.7", "21:00", 2, 1);

  // 6.8 월
  set("6.8", "20:00", 4, 1); set("6.8", "20:30", 4, 0); set("6.8", "21:00", 3, 1);
  set("6.8", "21:30", 2, 1);

  // 6.9 화
  set("6.9", "19:00", 2, 1); set("6.9", "20:00", 3, 1); set("6.9", "20:30", 3, 0);

  // 6.10 수
  set("6.10","19:30", 3, 0); set("6.10","20:00", 4, 1); set("6.10","20:30", 3, 1);

  return agg;
}

/* Color a heat cell. Build a soft gradient: 1–2 people uses Baby Blue
   (just data, not yet a match), 3+ ramps up Forest as it becomes
   a real candidate. Maybe count adds a soft mango border. */
function cellStyle({ ok, m }, hovered) {
  let bg = "transparent";
  let color = "var(--color-text-2)";
  if (ok >= 5)      { bg = "#1A9562";              color = "#fff"; }
  else if (ok === 4){ bg = "rgba(26,149,98,0.45)"; color = "#fff"; }
  else if (ok === 3){ bg = "rgba(26,149,98,0.22)"; color = "var(--color-text)"; }
  else if (ok === 2){ bg = "rgba(183,211,255,0.55)"; color = "var(--color-text)"; }   // Baby Blue
  else if (ok === 1){ bg = "rgba(214,231,255,0.55)"; color = "var(--color-text-2)"; } // lighter Baby Blue

  const border = m > 0
    ? `1px dashed var(--color-maybe)`
    : `1px solid ${ok > 0 ? "transparent" : "var(--color-line)"}`;

  return {
    background: bg,
    color,
    border,
    boxShadow: hovered ? "0 0 0 2px var(--color-primary)" : "none",
    transition: "box-shadow 120ms",
  };
}

function HeatScale() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--color-text-2)", flexWrap: "wrap" }}>
      {/* Baby Blue range — 1~2명 */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-line)" }}>
          <span style={{ width: 18, height: 14, background: "rgba(214,231,255,0.55)" }} />
          <span style={{ width: 18, height: 14, background: "rgba(183,211,255,0.55)" }} />
        </span>
        <span>1–2명 가능</span>
      </span>
      {/* Forest range — 3+ */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-line)" }}>
          <span style={{ width: 18, height: 14, background: "rgba(26,149,98,0.22)" }} />
          <span style={{ width: 18, height: 14, background: "rgba(26,149,98,0.45)" }} />
          <span style={{ width: 18, height: 14, background: "#1A9562" }} />
        </span>
        <span>3명 이상 — 추천 가능</span>
      </span>
      {/* Maybe marker */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        <span style={{ display: "inline-block", width: 14, height: 14, border: "1px dashed var(--color-maybe)", borderRadius: 3 }} />
        <span>애매 포함</span>
      </span>
    </div>
  );
}

function TimeAggregate() {
  const agg = useTAMemo(buildAgg, []);
  const [hover, setHover] = useTAState(null);
  const [picked, setPicked] = useTAState("6.6_20:00");

  const pickedData = picked ? agg[picked] : null;
  const [pickedDay, pickedHour] = picked ? picked.split("_") : [];
  const pickedX = pickedData ? TOTAL - pickedData.ok - pickedData.m : null;

  const participants = [
    { name: "소미", req: true, state: "available" },
    { name: "지현", req: true, state: "available" },
    { name: "민수", req: false, state: "available" },
    { name: "유나", req: false, state: "available" },
    { name: "태오", req: false, state: "available" },
    { name: "하린", req: false, state: "maybe" },
  ];

  return (
    <div className="split">
      {/* Main — heatmap */}
      <div className="card" style={{ padding: 28, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="t-h2">언제 가장 많이 모일 수 있을까요?</h2>
            <div className="t-body2" style={{ marginTop: 6 }}>색이 진할수록 더 많은 사람이 가능해요. 셀을 누르면 누가 가능한지 보여드릴게요.</div>
          </div>
          <HeatScale />
        </div>

        <div style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 6, fontFamily: "inherit" }}>
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                {DAYS.map(d => (
                  <th key={d.id} style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "-0.005em",
                    color: "var(--color-text-2)", padding: "4px 0", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)" }}>{d.weekday}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>{d.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h}>
                  <td style={{ fontSize: 11, color: "var(--color-text-2)", textAlign: "right", paddingRight: 8, verticalAlign: "middle" }}>
                    {h}
                  </td>
                  {DAYS.map(d => {
                    const key = `${d.id}_${h}`;
                    const data = agg[key];
                    const isHover = hover === key;
                    const isPicked = picked === key;
                    return (
                      <td key={key} style={{ padding: 0 }}>
                        <button
                          type="button"
                          onMouseEnter={() => setHover(key)}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => setPicked(key)}
                          style={{
                            width: "100%", height: 42,
                            border: 0, padding: 0, cursor: "pointer",
                            borderRadius: 8,
                            fontSize: 13, fontWeight: 700,
                            outline: isPicked ? "2px solid var(--color-primary)" : "none",
                            outlineOffset: isPicked ? 1 : 0,
                            ...cellStyle(data, isHover && !isPicked),
                          }}
                          aria-label={`${d.weekday} ${d.label} ${h} 가능 ${data.ok}명 애매 ${data.m}명`}
                        >
                          {data.ok > 0 ? data.ok : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side rail — detail of the picked slot */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card tight" style={{ padding: 22 }}>
          <div className="section-title">선택한 시간</div>
          {picked ? (
            <>
              <h3 className="t-h3" style={{ marginBottom: 6 }}>
                {pickedDay} ({DAYS.find(d => d.id === pickedDay)?.weekday}) 오후 {pickedHour}
              </h3>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 14, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
                  <b style={{ fontSize: 22, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>{pickedData.ok}</b>
                  <span style={{ fontSize: 12, color: "var(--color-primary)" }}>가능</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-maybe-text)" }}>{pickedData.m}</b>
                  <span style={{ fontSize: 12, color: "var(--color-maybe-text)" }}>애매</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
                  <b style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-muted)" }}>{pickedX}</b>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>응답 대기</span>
                </span>
              </div>

              <div className="divider" />

              <div className="section-title" style={{ marginTop: 14 }}>참여자별 상태</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {participants.map((p, i) => {
                  // Deterministic "state per slot" for the demo. Real impl reads from real data.
                  const idx = (pickedDay.charCodeAt(0) + pickedHour.charCodeAt(0) + i) % 5;
                  const state = idx < 3 ? "available" : idx === 3 ? "maybe" : "unavail";
                  const lbl   = state === "available" ? "가능" : state === "maybe" ? "애매" : "불가";
                  const cls   = state === "available" ? "ok"   : state === "maybe" ? "maybe" : "gray";
                  return (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        position: "relative",
                        width: 22, height: 22, borderRadius: 999,
                        background: "var(--color-bg-2)", color: "var(--color-text-2)",
                        fontSize: 10, fontWeight: 700,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flex: "none",
                      }}>
                        {p.name[0]}
                        {p.req && (
                          <span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: 999, background: "var(--color-accent)", border: "1.5px solid #fff" }} />
                        )}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                        {p.name}
                        {p.req && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-accent)", marginLeft: 5 }}>필수</span>}
                      </span>
                      <span className={`pill ${cls}`} style={{ height: 22, padding: "0 8px", fontSize: 11 }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--color-text-2)", fontSize: 13 }}>히트맵에서 시간을 누르면 상세 정보가 보여요.</div>
          )}
        </div>

        <div className="card tight" style={{ position: "relative", overflow: "hidden", padding: 22 }}>
          <span style={{ position: "absolute", top: -20, right: -16, width: 70, height: 70, borderRadius: 999, background: "var(--color-baby-blue)", opacity: 0.55 }} />
          <div className="section-title">응답 현황</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.03em" }}>5</span>
            <span style={{ fontSize: 14, color: "var(--color-text-2)" }}>/ 6명</span>
          </div>
          <div style={{ height: 8, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "83%", height: "100%", background: "var(--color-primary)", borderRadius: 999 }} />
          </div>
          <div className="t-cap" style={{ marginTop: 10 }}>마감 5.30 (금) 23:59 · 남은 시간 2일 6시간</div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { TimeAggregate });
