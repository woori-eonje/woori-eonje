/* MyMeetings.jsx — Host's meetings list. Tabs by status + cards.
   Includes empty state on the "지난 모임" tab. */

const { useState: useMMState, useMemo: useMMMemo } = React;

const TABS = [
  { id: "active",   label: "진행",      status: "COLLECTING" },
  { id: "ready",    label: "확정 필요", status: "READY_TO_CONFIRM" },
  { id: "done",     label: "확정",      status: "CONFIRMED" },
  { id: "closed",   label: "지난",      status: "CLOSED" },
];

const SAMPLE_MEETINGS = [
  {
    id: "m1",
    name: "6월 전시 모임",
    desc: "6월 초에 전시 보러 갈 사람들 일정 조율",
    status: "COLLECTING",
    responded: 5, total: 6,
    due: "5.30 (금) 23:59",
    untilDue: "2일 6시간",
    kind: "친구",
  },
  {
    id: "m2",
    name: "프로젝트 킥오프 미팅",
    desc: "사이드프로젝트 시작 전 첫 미팅",
    status: "COLLECTING",
    responded: 2, total: 4,
    due: "6.1 (월) 18:00",
    untilDue: "3일",
    kind: "비즈니스",
  },
  {
    id: "m3",
    name: "수요 스터디 시간 조율",
    desc: "다음 달 수요 스터디 시간 정하기",
    status: "READY_TO_CONFIRM",
    responded: 6, total: 6,
    due: "5.28 (수) 22:00",
    untilDue: "마감",
    kind: "스터디",
  },
  {
    id: "m4",
    name: "5월 보드게임 모임",
    desc: "5월 마지막 주말 보드게임 시간 조율",
    status: "CONFIRMED",
    responded: 5, total: 5,
    confirmedAt: "5.25 (토) 오후 7:00",
    kind: "친구",
  },
];

function MeetingCard({ m, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: "100%", textAlign: "left",
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 20, padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 12,
        fontFamily: "inherit", cursor: "pointer",
        transition: "border-color 160ms",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-primary)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-line)"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", letterSpacing: 0.04, textTransform: "uppercase" }}>{m.kind}</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 4 }}>{m.name}</div>
          <div className="clamp-2" style={{ fontSize: 13, color: "var(--color-text-2)", marginTop: 4, lineHeight: 1.55, letterSpacing: "-0.01em", wordBreak: "keep-all" }}>{m.desc}</div>
        </div>
        <StatusPill status={m.status} />
      </div>

      <div style={{ borderTop: "1px dashed var(--color-line)" }} />

      {m.status === "CONFIRMED" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.Calendar size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-primary)", letterSpacing: "-0.015em" }}>{m.confirmedAt}</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-2)", whiteSpace: "nowrap" }}>
              <b style={{ color: "var(--color-text)", fontWeight: 700 }}>{m.responded}/{m.total}명</b> 응답
            </span>
            <span style={{ fontSize: 12, color: m.untilDue === "마감" ? "var(--color-error)" : "var(--color-text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>
              마감까지 {m.untilDue}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${(m.responded / m.total) * 100}%`, height: "100%",
              background: m.status === "READY_TO_CONFIRM" ? "var(--color-maybe)" : "var(--color-primary)",
              borderRadius: 999,
              transition: "width 320ms",
            }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-2)" }}>응답 마감 · {m.due}</div>
        </div>
      )}

      {m.status === "READY_TO_CONFIRM" && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          alignSelf: "flex-start", padding: "6px 10px",
          background: "var(--color-maybe-soft)", color: "var(--color-maybe-text)",
          borderRadius: 8, fontSize: 12, fontWeight: 700,
        }}>
          모든 응답이 모였어요 · 추천 결과 확인하기 →
        </div>
      )}
    </button>
  );
}

/* ===== Empty state ===================================================== */
function EmptyMeetings({ tab, onCreate }) {
  const copy = {
    active: { title: "진행 중인 모임이 없어요", sub: "새 모임을 만들어 친구들에게 보내볼까요?" },
    ready:  { title: "확정 필요한 모임이 없어요", sub: "참여자 응답이 모이면 여기에서 알려드릴게요." },
    done:   { title: "아직 확정된 모임이 없어요", sub: "추천 결과에서 시간을 확정하면 여기로 옮겨와요." },
    closed: { title: "지난 모임이 없어요", sub: "끝난 모임은 여기에서 다시 볼 수 있어요." },
  }[tab];
  return (
    <div style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width="100" height="74" viewBox="0 0 80 60">
        <path d="M0 60 V20 Q0 0 20 0 Q40 0 40 20 V60 Z" fill="#1A9562" opacity="0.85"/>
        <path d="M40 60 V28 Q40 12 56 12 Q72 12 72 28 V60 Z" fill="#D6E7FF"/>
        <path d="M72 60 V36 Q72 24 80 24 V60 Z" fill="#E6DBF7"/>
      </svg>
      <h3 className="t-h2" style={{ marginTop: 4 }}>{copy.title}</h3>
      <div className="t-body2" style={{ maxWidth: 260 }}>{copy.sub}</div>
      {tab === "active" && (
        <Button primary onClick={onCreate} leftIcon={<Icons.PlusCircle size={16} color="#fff" />}>
          모임 만들기
        </Button>
      )}
    </div>
  );
}

/* ===== MyMeetings root =============================================== */
function MyMeetings({ onBack, onCreate, onOpen }) {
  const [tab, setTab] = useMMState("active");
  const filtered = useMMMemo(() =>
    SAMPLE_MEETINGS.filter(m => m.status === TABS.find(t => t.id === tab).status),
    [tab]
  );

  return (
    <div className="screen">
      <TopBar
        title="내 모임"
        onBack={onBack}
        right={
          <button onClick={onCreate} aria-label="새 모임 만들기"
            style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: "var(--color-primary-soft)", color: "var(--color-primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.PlusCircle size={20} color="var(--color-primary)" />
          </button>
        }
      />

      {/* Tabs — 4-column grid so nothing crops at the right edge */}
      <div style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-line)",
        padding: "10px 12px",
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
      }}>
        {TABS.map(t => {
          const on = tab === t.id;
          const count = SAMPLE_MEETINGS.filter(m => m.status === t.status).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                width: "100%",
                padding: "7px 8px",
                background: on ? "var(--color-primary-soft)" : "transparent",
                color:      on ? "var(--color-primary)" : "var(--color-text-2)",
                border: on ? "1px solid var(--color-primary)" : "1px solid transparent",
                borderRadius: 999,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "background 160ms",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
              {t.label}
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  padding: "1px 5px", borderRadius: 999,
                  background: on ? "var(--color-primary)" : "var(--color-bg-2)",
                  color: on ? "#fff" : "var(--color-text-2)",
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List or empty */}
      <div className="scroll" style={{ padding: filtered.length ? "16px 20px 24px" : 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <EmptyMeetings tab={tab} onCreate={onCreate} />
        ) : (
          filtered.map(m => (
            <MeetingCard key={m.id} m={m} onOpen={() => onOpen && onOpen(m)} />
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MyMeetings });
