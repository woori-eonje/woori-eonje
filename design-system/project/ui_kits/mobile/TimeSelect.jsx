/* TimeSelect.jsx — the participant time-select screen.
   Heart of the product. Mobile-first.
   Uses globals from Primitives.jsx (Button, TopBar, Icons). */

const { useState: useTSState, useMemo: useTSMemo } = React;

const STATES = ["available", "maybe", "unavail"];
const STATE_INFO = {
  available: { tag: "○ 가능", short: "가능" },
  maybe:     { tag: "△ 애매", short: "애매" },
  unavail:   { tag: "✕ 불가", short: "불가" },
  selected:  { tag: "✓ 선택", short: "선택" },
};

function dateLabel(d) { return d; }

function DateTab({ active, label, weekday, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "none",
        minWidth: 64,
        padding: "10px 12px",
        border: active ? "1px solid var(--color-primary)" : "1px solid transparent",
        background: active ? "var(--color-primary-soft)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-text)",
        borderRadius: 14,
        fontFamily: "inherit",
        letterSpacing: "-0.015em",
        cursor: "pointer",
        textAlign: "center",
        transition: "background 160ms, border-color 160ms",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{weekday}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{label}</div>
      {count > 0 && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          marginTop: 4,
          color: "var(--color-primary)",
        }}>● {count}</div>
      )}
    </button>
  );
}

function TimeSlot({ time, state, mode, onTap }) {
  const display = state === mode && state !== null
    ? (state === "available" ? "s-selected" : `s-${state}`)
    : state === null ? "" : `s-${state}`;
  // Show "selected" emphasis only when the slot's state matches current mode === available
  // For maybe and unavail we show the state colour directly.
  const cls = state === null ? "" :
              state === "available" ? "s-available" :
              state === "maybe" ? "s-maybe" :
              "s-unavail";
  const tag = state === null ? null : STATE_INFO[state].tag;
  return (
    <button
      type="button"
      className={`slot ${cls}`}
      onClick={onTap}
      aria-label={`${time} ${state ? STATE_INFO[state].short : "선택 안 함"}`}
    >
      <span>{time}</span>
      {tag ? <span className="tag">{tag}</span> :
        <span className="tag" style={{ opacity: 0.5 }}>—</span>}
    </button>
  );
}

function ModeToggle({ value, onChange }) {
  return (
    <div className="toggle" role="tablist" aria-label="현재 선택 모드">
      {STATES.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          className={`${value === s ? "on " + s : ""}`}
          onClick={() => onChange(s)}
        >
          {STATE_INFO[s].tag}
        </button>
      ))}
    </div>
  );
}

function TimeSelect({ onBack, onSubmit }) {
  const dates = [
    { id: "6.4", label: "6.4", weekday: "목" },
    { id: "6.5", label: "6.5", weekday: "금" },
    { id: "6.6", label: "6.6", weekday: "토" },
    { id: "6.7", label: "6.7", weekday: "일" },
    { id: "6.8", label: "6.8", weekday: "월" },
    { id: "6.9", label: "6.9", weekday: "화" },
  ];
  const times = ["오후 6:00","오후 6:30","오후 7:00","오후 7:30","오후 8:00","오후 8:30","오후 9:00","오후 9:30","오후 10:00","오후 10:30"];

  const [activeDate, setActiveDate] = useTSState("6.6");
  const [mode, setMode] = useTSState("available");
  const [picks, setPicks] = useTSState(() => ({
    // seed a few defaults so the screen looks alive
    "6.6": { "오후 7:00": "available", "오후 7:30": "available", "오후 8:00": "available", "오후 8:30": "maybe" },
    "6.5": { "오후 9:00": "available" },
  }));

  const summary = useTSMemo(() => {
    let ok = 0, m = 0, x = 0;
    Object.values(picks).forEach(o => {
      Object.values(o).forEach(s => {
        if (s === "available") ok++;
        else if (s === "maybe") m++;
        else if (s === "unavail") x++;
      });
    });
    return { ok, m, x, total: ok + m + x };
  }, [picks]);

  const dayCount = (id) => Object.keys(picks[id] || {}).filter(t => picks[id][t]).length;

  const onTapSlot = (time) => {
    setPicks((prev) => {
      const day = { ...(prev[activeDate] || {}) };
      if (day[time] === mode) delete day[time];   // tap again to clear
      else day[time] = mode;
      return { ...prev, [activeDate]: day };
    });
  };

  const onQuick = (kind) => {
    setPicks(prev => {
      const next = { ...prev };
      if (kind === "reset") {
        return {};
      }
      if (kind === "clear-day") {
        const n = { ...prev };
        delete n[activeDate];
        return n;
      }
      if (kind === "weekday-evening") {
        ["6.4","6.5","6.8","6.9"].forEach(id => {
          next[id] = { ...(next[id]||{}), "오후 7:00":"available","오후 7:30":"available","오후 8:00":"available" };
        });
      }
      if (kind === "weekend-afternoon") {
        ["6.6","6.7"].forEach(id => {
          next[id] = { ...(next[id]||{}), "오후 6:00":"available","오후 6:30":"available","오후 7:00":"available" };
        });
      }
      return next;
    });
  };

  return (
    <div className="screen">
      <TopBar
        title="6월 전시 모임"
        onBack={onBack}
        right={<span className="pill ok" style={{ marginRight: 12 }}>● 응답 수집 중</span>}
      />

      {/* Meeting summary strip */}
      <div style={{ padding: "12px 20px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="t-body2" style={{ color: "var(--color-text-2)" }}>
          6.1 – 6.14 · 예상 <b style={{ color: "var(--color-text)" }}>2시간</b> · 마감 <b style={{ color: "var(--color-text)" }}>5.30 (금) 23:59</b>
        </div>
        <div className="t-cap">소미 (나) · 비회원 참여 중 · 응답 마감일까지 수정할 수 있어요</div>
      </div>

      {/* Date tabs */}
      <div className="h-scroll" style={{
        gap: 6,
        padding: "12px 16px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-line)",
      }}>
        {dates.map(d => (
          <DateTab key={d.id}
            label={d.label} weekday={d.weekday}
            active={activeDate === d.id}
            count={dayCount(d.id)}
            onClick={() => setActiveDate(d.id)}
          />
        ))}
      </div>

      {/* Body — scrollable */}
      <div className="scroll" style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-cap">상태를 고른 뒤 시간을 눌러주세요.</div>
          <ModeToggle value={mode} onChange={setMode} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekday-evening")}>
            평일 저녁 가능
          </button>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("weekend-afternoon")}>
            주말 오후 가능
          </button>
          <button className="chip danger" style={{ justifyContent: "center" }} onClick={() => onQuick("reset")}>
            전체 초기화
          </button>
          <button className="chip" style={{ justifyContent: "center" }} onClick={() => onQuick("clear-day")}>
            선택 지우기
          </button>
        </div>

        <div className="divider" />

        <div className="slot-grid">
          {times.map(t => (
            <TimeSlot
              key={t}
              time={t}
              state={picks[activeDate]?.[t] || null}
              mode={mode}
              onTap={() => onTapSlot(t)}
            />
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="bottom-bar">
        <div className="summary" style={{ gap: 12 }}>
          <span style={{ whiteSpace: "nowrap" }}>선택한 시간 <b>{summary.total}개</b></span>
          <span style={{ whiteSpace: "nowrap" }}>가능 {summary.ok} · 애매 {summary.m} · 불가 {summary.x}</span>
        </div>
        <Button block primary onClick={onSubmit} disabled={summary.total === 0}>
          제출하기
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { TimeSelect });
