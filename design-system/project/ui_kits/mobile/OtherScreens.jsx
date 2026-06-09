/* OtherScreens.jsx — Landing, Invite/Join, Submitted (success),
   FinalSummary. Smaller screens grouped for tidiness. */

const { useState: useOSState, useEffect: useOSEffect } = React;

/* ===== Landing ========================================================
   Hero is copy-driven. The top header carries the wordmark; the hero
   carries the *message*. A small rolling kicker shows the use-cases. */
function Landing({ onCreate, onJoin }) {
  const kickers = [
    "친구랑 만날까",
    "여행 떠나지",
    "팀이랑 회의해",
    "스터디 모일까",
  ];
  const [idx, setIdx] = useOSState(0);
  useOSEffect(() => {
    const t = setTimeout(() => setIdx(i => (i + 1) % kickers.length), 2200);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div className="screen white" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <Logo size={28} />
      </div>

      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "12px 20px 24px" }}>

        {/* Hero — message-first */}
        <div style={{ position: "relative", paddingTop: 8 }}>
          {/* Decorative pastel shapes — quiet, off to the right */}
          <svg width="42" height="32" viewBox="0 0 64 48" style={{ position: "absolute", top: 8, right: 4 }} aria-hidden="true">
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562"/>
            <circle cx="24" cy="22" r="2" fill="#fff"/><circle cx="40" cy="22" r="2" fill="#fff"/>
            <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
          <svg width="36" height="22" viewBox="0 0 80 44" style={{ position: "absolute", top: 56, right: 56 }} aria-hidden="true">
            <path d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z" fill="#D6E7FF"/>
          </svg>
          <svg width="32" height="32" viewBox="0 0 56 36" style={{ position: "absolute", top: 96, right: 10 }} aria-hidden="true">
            <path d="M0 36 Q0 0 28 0 Q56 0 56 36 Z" fill="#E6DBF7"/>
          </svg>

          {/* Rolling kicker — supportive, not dominant */}
          <div aria-live="polite" style={{
            display: "inline-flex", alignItems: "baseline",
            fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em",
            color: "var(--color-text-2)",
            background: "var(--color-bg-2)",
            padding: "5px 12px", borderRadius: 999,
            marginBottom: 16,
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}>
            <span style={{ color: "var(--color-text-muted)" }}>요즘 모임,&nbsp;</span>
            <span className="roll-mask" style={{ height: "1.2em", lineHeight: 1.2 }}>
              <span className="roll-track" style={{ transform: `translateY(-${idx * 1.2}em)` }}>
                {kickers.map((k, i) => (
                  <span key={i} className="roll-line" style={{ height: "1.2em", lineHeight: 1.2, color: "var(--color-text)" }}>{k}</span>
                ))}
              </span>
            </span>
            <span style={{ color: "var(--color-accent)", fontWeight: 800, marginLeft: 1 }}>?</span>
          </div>

          {/* Copy-driven headline (no second wordmark) */}
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 800,
            lineHeight: 1.3, letterSpacing: "-0.035em",
          }}>
            언제 되는지,<br/>
            <span style={{ color: "var(--color-text)" }}>이제 한 번에 모아봐요.</span>
          </h1>
          <p className="t-body" style={{ marginTop: 14, color: "var(--color-text-2)", maxWidth: 320 }}>
            모임장이 기간만 정하면, 우리가 흩어진 답변을 정리해서 가장 잘 맞는 시간을 찾아드려요.
          </p>
        </div>

        {/* Flow preview — vertical 3-step */}
        <div style={{
          background: "#fff",
          border: "1px solid var(--color-line)",
          borderRadius: 20,
          padding: "18px 18px 6px",
        }}>
          <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, letterSpacing: 0.06, textTransform: "uppercase", marginBottom: 14 }}>이렇게 흘러가요</div>

          {[
            { label: "초대 링크 공유",         sub: "단톡방에 링크 하나만",  Icn: Icons.Share,         bg: "var(--color-baby-blue)",    fg: "#1A4F87" },
            { label: "가능한 시간 고르기",     sub: "탭으로 빠르게",        Icn: Icons.Clock,         bg: "var(--color-lavender)",     fg: "#5A3D8A" },
            { label: "가장 잘 맞는 시간 확인", sub: "모두에게 맞춰서",      Icn: Icons.CalendarCheck, bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
          ].map((s, i, a) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < a.length - 1 ? "1px dashed var(--color-line)" : "none" }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.bg, color: s.fg,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flex: "none",
              }}><s.Icn size={18} color={s.fg} stroke={1.85} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.label}</div>
                <div className="t-cap" style={{ marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — stays pinned, never overlaps */}
      <div className="bottom-bar">
        <Button block primary onClick={onCreate} leftIcon={<Icons.PlusCircle size={18} color="#fff" />}>
          모임 만들기
        </Button>
        <button
          onClick={onJoin}
          style={{ background: "transparent", border: 0, color: "var(--color-text-2)", fontFamily: "inherit", fontSize: 13, padding: 6, cursor: "pointer" }}
        >
          초대 링크로 참여하기 →
        </button>
      </div>
    </div>
  );
}

/* ===== Invite / Join ================================================== */
function InviteJoin({ onBack, onStart }) {
  const [name, setName] = useOSState("");
  const valid = name.trim().length >= 2;

  return (
    <div className="screen">
      <TopBar title="모임 참여" onBack={onBack} />

      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 20, padding: 20,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: "var(--color-primary-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Calendar size={22} color="var(--color-primary)" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-primary)", letterSpacing: 0.04 }}>친구 모임</div>
              <h2 className="t-h2">6월 전시 모임</h2>
            </div>
          </div>
          <div className="t-body2">6월 초에 전시 보러 갈 사람들 일정 조율</div>
          <div className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div className="t-cap">조율 기간</div>
              <div className="t-body" style={{ fontWeight: 700 }}>6.1 — 6.14</div>
            </div>
            <div>
              <div className="t-cap">예상 소요</div>
              <div className="t-body" style={{ fontWeight: 700 }}>2시간</div>
            </div>
            <div>
              <div className="t-cap">선택 시간대</div>
              <div className="t-body2" style={{ fontWeight: 600 }}>평일 18–23 · 주말 12–20</div>
            </div>
            <div>
              <div className="t-cap">응답 마감</div>
              <div className="t-body" style={{ fontWeight: 700 }}>5.30 (금) 23:59</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em" }}>
            닉네임 <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>*</span>
          </label>
          <input
            className="input"
            placeholder="단톡방에서 쓰는 이름이면 좋아요"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={12}
          />
          <div className="t-cap">2–12자 · 한글·영문·숫자</div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-2)", textAlign: "center", lineHeight: 1.6 }}>
          닉네임만 입력하면 바로 참여할 수 있어요.<br/>회원가입은 필요하지 않아요.
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary onClick={() => onStart(name.trim())} disabled={!valid}>
          참여 시작
        </Button>
      </div>
    </div>
  );
}

/* ===== Submitted ====================================================== */
function Submitted({ onEdit, onClose }) {
  return (
    <div className="screen">
      <TopBar title="6월 전시 모임" />
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center", flex: 1 }}>

        <div style={{ marginTop: 20, position: "relative", width: 220, height: 160 }}>
          {/* Forest half-dome with smile */}
          <svg width="120" height="86" viewBox="0 0 64 48" style={{ position: "absolute", top: 30, left: 50 }}>
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562"/>
            <circle cx="24" cy="22" r="2.2" fill="#fff"/>
            <circle cx="40" cy="22" r="2.2" fill="#fff"/>
            <path d="M22 30 Q32 38 42 30" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </svg>
          <svg width="32" height="32" viewBox="0 0 36 36" style={{ position: "absolute", top: 0, right: 12 }}>
            <path d="M18 0 L20 14 L34 16 L20 18 L18 36 L16 18 L2 16 L16 14 Z" fill="#FF6B6B"/>
          </svg>
          <svg width="48" height="26" viewBox="0 0 80 44" style={{ position: "absolute", top: 16, left: 0 }}>
            <path d="M0 44 Q0 0 40 0 Q80 0 80 44 L62 44 Q62 18 40 18 Q18 18 18 44 Z" fill="#D6E7FF"/>
          </svg>
        </div>

        <h2 className="t-h1" style={{ marginTop: 4 }}>응답을 보냈어요</h2>
        <div className="t-body" style={{ color: "var(--color-text-2)", maxWidth: 280 }}>
          결과는 마감일에 알려드릴게요. 마감 전까지는 언제든 응답을 수정할 수 있어요.
        </div>

        <div style={{
          marginTop: 8, width: "100%",
          background: "var(--color-surface)", border: "1px solid var(--color-line)",
          borderRadius: 16, padding: 14,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div className="t-cap">내 응답 요약</div>
          <div className="t-body" style={{ fontWeight: 700 }}>가능 8개 · 애매 4개 · 불가 0개</div>
          <div className="t-cap">마감까지 <b style={{ color: "var(--color-primary)" }}>2일 6시간</b> 남았어요</div>
        </div>
      </div>

      <div className="bottom-bar">
        <Button block outline onClick={onEdit}>응답 수정</Button>
        <Button block ghost onClick={onClose}>모임 정보 다시 보기</Button>
      </div>
    </div>
  );
}

/* ===== Final summary (confirmed) ====================================== */
function FinalSummary({ onBack, onCopy }) {
  const participants = ["소미", "지현", "민수", "유나", "태오", "하린"];
  return (
    <div className="screen">
      <TopBar title="확정된 일정" onBack={onBack} right={<StatusPill status="CONFIRMED" />} />
      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
          <svg width="56" height="40" viewBox="0 0 64 48" style={{ position: "absolute", top: -8, right: -10, opacity: 0.9 }}>
            <path d="M0 48 Q0 0 32 0 Q64 0 64 48 Z" fill="#1A9562"/>
            <circle cx="24" cy="22" r="2" fill="#fff"/><circle cx="40" cy="22" r="2" fill="#fff"/>
            <path d="M24 30 Q32 36 40 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
          <div className="t-cap" style={{ color: "var(--color-primary)", fontWeight: 800 }}>6월 전시 모임 · 확정</div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.04em" }}>
            6.8 (토)<br/>오후 2:00 – 4:00
          </h2>
          <div className="dashed-divider" />
          <div className="t-body2">6월 초에 전시 보러 갈 사람들 일정 조율</div>
        </div>

        <div className="card tight" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.04 }}>참여자 6명</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {participants.map((p, i) => (
              <span key={p} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px",
                background: "var(--color-bg)", borderRadius: 999,
                fontSize: 13, fontWeight: 700,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 999,
                  background: ["#1A9562","#D6E7FF","#E6DBF7","#F5AB54","#1A9562","#D6E7FF"][i % 6],
                  color: i % 3 === 1 ? "#333" : "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                }}>{p[0]}</span>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="card tight" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--color-primary-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Calendar size={20} color="var(--color-primary)" />
          </span>
          <div style={{ flex: 1 }}>
            <div className="t-body" style={{ fontWeight: 700 }}>캘린더에 추가</div>
            <div className="t-cap">Google / Apple / .ics</div>
          </div>
          <Icons.ChevronRight size={18} color="var(--color-text-muted)" />
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary onClick={onCopy} leftIcon={<Icons.Share size={18} color="#fff" />}>
          공유 링크 복사
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { Landing, InviteJoin, Submitted, FinalSummary });
