/* Wizard.jsx — Host-side 5-step meeting creation flow.
   One decision per step. Question-form titles. Forest CTA at the bottom. */

const { useState: useWState } = React;

const STEPS = [
  { id: 1, label: "모임 정보",   q: "어떤 모임인가요?" },
  { id: 2, label: "기간",        q: "언제 사이에서 고를까요?" },
  { id: 3, label: "소요 시간",   q: "얼마나 만날 예정인가요?" },
  { id: 4, label: "초대",        q: "초대 링크를 공유해요" },
  { id: 5, label: "완료",        q: "응답을 기다리고 있어요" },
];

/* ----- Step indicator (compact mobile pattern) ----------------------
   "Step n/5 · 모임 정보" + thin progress bar. Clean and quiet. */
function StepBar({ current }) {
  const s = STEPS.find(x => x.id === current);
  const pct = (current / STEPS.length) * 100;
  return (
    <div style={{ padding: "12px 20px 14px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-line)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: 0.04, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Step {current} / {STEPS.length}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
            {s.label}
          </span>
        </div>
        <span className="t-cap" style={{ whiteSpace: "nowrap" }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 4, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "var(--color-primary)",
          borderRadius: 999,
          transition: "width 320ms cubic-bezier(.22, 1, .36, 1)",
        }} />
      </div>
    </div>
  );
}

/* ----- Reusable: section heading + helper -------------------------- */
function Section({ q, helper, sub, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sub ? 12 : 16 }}>
      <div>
        <h2 style={{
          margin: 0,
          fontSize: sub ? 16 : 24,
          fontWeight: sub ? 700 : 800,
          letterSpacing: sub ? "-0.02em" : "-0.035em",
          lineHeight: 1.3,
          color: sub ? "var(--color-text-2)" : "var(--color-text)",
        }}>
          {q}
        </h2>
        {helper && <p className="t-body2" style={{ marginTop: 6 }}>{helper}</p>}
      </div>
      {children}
    </div>
  );
}

/* ----- Reusable: option card (for radio-like choices) -------------- */
function OptionCard({ icon, title, subtitle, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: active ? "var(--color-primary-soft)" : "var(--color-surface)",
        border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
        borderRadius: 14, padding: "11px 14px",
        display: "flex", alignItems: "center", gap: 12,
        fontFamily: "inherit", cursor: "pointer",
        transition: "background 160ms, border-color 160ms, transform 90ms",
      }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.99)"}
      onMouseUp={e => e.currentTarget.style.transform = ""}
      onMouseLeave={e => e.currentTarget.style.transform = ""}
    >
      <span style={{
        width: 32, height: 32, borderRadius: 10, flex: "none",
        background: active ? "#fff" : "var(--color-bg)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: active ? "var(--color-primary)" : "var(--color-text)",
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em", color: active ? "var(--color-primary)" : "var(--color-text)" }}>{title}</span>
        {subtitle && <span style={{ display: "block", fontSize: 12, color: "var(--color-text-2)", marginTop: 1 }}>{subtitle}</span>}
      </span>
      <span style={{
        width: 18, height: 18, borderRadius: 999,
        border: active ? "0" : "1.5px solid var(--color-line-strong)",
        background: active ? "var(--color-primary)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 10, fontWeight: 800,
      }}>{active ? "✓" : ""}</span>
    </button>
  );
}

/* ===== Step 1 · 모임 정보 ============================================= */
function Step1({ data, set, onNext }) {
  const types = [
    { id: "friend",   icon: Icons.Users,     title: "친구 모임",   sub: "전시, 모임, 가벼운 약속" },
    { id: "study",    icon: Icons.BookOpen,  title: "스터디",     sub: "정기 / 부정기 학습 모임" },
    { id: "business", icon: Icons.Briefcase, title: "비즈니스",   sub: "팀 회의, 미팅" },
  ];
  const valid = data.name.trim().length >= 2 && data.kind;

  return (
    <>
      <div className="scroll" style={{ padding: "20px 20px 96px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Section q={STEPS[0].q} helper="이름과 한 줄 설명만 적어도 충분해요.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>모임명 <span style={{ color: "var(--color-accent)" }}>*</span></label>
            <input className="input" placeholder="예) 6월 전시 모임"
              value={data.name} onChange={e => set({ name: e.target.value })} maxLength={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>한 줄 설명</label>
            <input className="input" placeholder="6월 초에 전시 보러 갈 사람들 일정 조율"
              value={data.desc} onChange={e => set({ desc: e.target.value })} maxLength={60} />
            <span className="t-cap">{data.desc.length}/60</span>
          </div>
        </Section>

        <Section q="모임 성격" sub>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {types.map(t => {
              const Icon = t.icon;
              const active = data.kind === t.id;
              return (
                <OptionCard key={t.id}
                  icon={<Icon size={18} color={active ? "var(--color-primary)" : "var(--color-text-2)"} stroke={1.85} />}
                  title={t.title}
                  subtitle={t.sub}
                  active={active}
                  onClick={() => set({ kind: t.id })}
                />
              );
            })}
          </div>
        </Section>
      </div>

      <div className="bottom-bar">
        <Button block primary disabled={!valid} onClick={onNext}>
          다음
        </Button>
      </div>
    </>
  );
}

/* ===== Step 2 · 기간 =================================================== */
function Step2({ data, set, onNext }) {
  const fields = [
    { key: "from", label: "조율 시작일", placeholder: "2026.06.01" },
    { key: "to",   label: "조율 종료일", placeholder: "2026.06.14" },
    { key: "due",  label: "응답 마감일", placeholder: "2026.05.30 23:59" },
  ];
  const valid = data.from && data.to && data.due;

  return (
    <>
      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Section q={STEPS[1].q} helper="이 기간 안에서 가능한 시간을 모아드려요. 응답 마감일은 조율 종료일보다 빨라야 해요.">
          {fields.map(f => (
            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                {f.label} <span style={{ color: "var(--color-accent)" }}>*</span>
              </label>
              <input className="input" placeholder={f.placeholder}
                value={data[f.key]} onChange={e => set({ [f.key]: e.target.value })} />
            </div>
          ))}
        </Section>

        <div style={{
          background: "var(--color-baby-blue)",
          color: "var(--color-text)",
          padding: "12px 14px", borderRadius: 12,
          fontSize: 13, lineHeight: 1.55, letterSpacing: "-0.01em",
        }}>
          <b>참고</b> · 보통 응답 마감일은 조율 종료일 2–3일 전이 좋아요. 너무 빠르면 참여자가 일정을 정하기 어려워요.
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary disabled={!valid} onClick={onNext}>
          다음
        </Button>
      </div>
    </>
  );
}

/* ===== Step 3 · 소요 시간 ============================================== */
function Step3({ data, set, onNext }) {
  const durations = [
    { id: "1h",  label: "1시간" },
    { id: "1.5h",label: "1시간 30분" },
    { id: "2h",  label: "2시간" },
    { id: "3h",  label: "3시간" },
    { id: "half",label: "반나절" },
    { id: "day", label: "하루" },
  ];
  const windows = [
    { id: "weekday-evening", label: "평일 저녁 18:00–23:00" },
    { id: "weekend-day",     label: "주말 낮 12:00–20:00" },
    { id: "weekday-day",     label: "평일 낮 09:00–18:00" },
    { id: "any",             label: "시간 제한 없음" },
  ];
  const valid = data.duration && data.windows.length > 0;

  return (
    <>
      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Section q={STEPS[2].q}>
          <div className="t-cap" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.04 }}>예상 소요 시간</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {durations.map(d => {
              const on = data.duration === d.id;
              return (
                <button key={d.id} type="button"
                  onClick={() => set({ duration: d.id })}
                  style={{
                    height: 48, padding: "0 10px",
                    background: on ? "var(--color-primary-soft)" : "var(--color-surface)",
                    color:      on ? "var(--color-primary)"       : "var(--color-text)",
                    border:     on ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                    borderRadius: 12,
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em",
                    cursor: "pointer",
                  }}>{d.label}</button>
              );
            })}
          </div>
        </Section>

        <Section q="선택 가능한 시간대" helper="여러 개 고를 수 있어요.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {windows.map(w => {
              const on = data.windows.includes(w.id);
              return (
                <button key={w.id} type="button"
                  onClick={() => {
                    set({ windows: on ? data.windows.filter(x => x !== w.id) : [...data.windows, w.id] });
                  }}
                  style={{
                    height: 48, padding: "0 14px",
                    background: on ? "var(--color-primary-soft)" : "var(--color-surface)",
                    color:      on ? "var(--color-primary)" : "var(--color-text)",
                    border:     on ? "1.5px solid var(--color-primary)" : "1px solid var(--color-line)",
                    borderRadius: 12,
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em",
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                  <span>{w.label}</span>
                  {on && <span style={{ fontSize: 12 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="bottom-bar">
        <Button block primary disabled={!valid} onClick={onNext}>
          모임 만들기
        </Button>
      </div>
    </>
  );
}

/* ===== Step 4 · 초대 ================================================== */
function Step4({ data, onNext }) {
  const link = "whenly.app/m/" + (data.name || "모임").replace(/\s+/g, "-") + "-x9k2";
  return (
    <>
      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Section q={STEPS[3].q} helper="이 링크를 단톡방에 보내면 누구든 닉네임만으로 참여할 수 있어요.">
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-line)",
            borderRadius: 16, padding: "6px 6px 6px 16px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ flex: 1, fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace", fontSize: 13, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
            <Button primary leftIcon={<Icons.Copy size={16} color="#fff" />} style={{ height: 42, padding: "0 14px" }}>복사</Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Button outline leftIcon={<Icons.Share size={16} color="var(--color-primary)" />} block>카카오톡 공유</Button>
            <Button outline leftIcon={<Icons.Share size={16} color="var(--color-primary)" />} block>다른 앱으로 공유</Button>
          </div>
        </Section>

        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14, padding: 14,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, textTransform: "uppercase" }}>방금 만든 모임</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.025em" }}>{data.name || "이름 없는 모임"}</div>
          <div className="t-body2">{data.from || "기간 미정"} – {data.to || "?"} · 예상 {data.duration || "?"} · 마감 {data.due || "?"}</div>
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary onClick={onNext}>응답 기다리기</Button>
      </div>
    </>
  );
}

/* ===== Step 5 · 응답 대기 ============================================= */
function Step5({ data, onSeeRecs }) {
  return (
    <>
      <div className="scroll" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 8 }}>
          <svg width="100" height="74" viewBox="0 0 76 62">
            <g fill="#E6DBF7">
              <circle cx="14" cy="36" r="14" /><circle cx="30" cy="20" r="14" />
              <circle cx="48" cy="18" r="16" /><circle cx="62" cy="36" r="14" />
              <circle cx="38" cy="46" r="16" />
            </g>
            <circle cx="32" cy="32" r="2.2" fill="#333" />
            <circle cx="46" cy="32" r="2.2" fill="#333" />
            <path d="M32 40 Q39 46 46 40" stroke="#333" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </svg>
          <h2 className="t-h1" style={{ margin: "10px 0 6px" }}>응답을 기다리고 있어요</h2>
          <div className="t-body2" style={{ maxWidth: 280 }}>참여자들이 가능한 시간을 입력하면 여기서 추천을 확인할 수 있어요.</div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="t-cap" style={{ color: "var(--color-text-2)", fontWeight: 800, textTransform: "uppercase" }}>응답 현황</div>
            <div className="t-cap">마감까지 2일 6시간</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.03em" }}>3</span>
            <span style={{ fontSize: 15, color: "var(--color-text-2)" }}>/ 6명 응답</span>
          </div>
          {/* progress */}
          <div style={{ height: 8, background: "var(--color-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "50%", height: "100%", background: "var(--color-primary)", borderRadius: 999 }} />
          </div>
          <div className="divider" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "소미", done: true,  req: true },
              { name: "지현", done: false, req: true },
              { name: "민수", done: true,  req: false },
              { name: "유나", done: true,  req: false },
              { name: "태오", done: false, req: false },
              { name: "하린", done: false, req: false },
            ].map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: p.done ? "var(--color-primary)" : "var(--color-bg-2)",
                  color: p.done ? "#fff" : "var(--color-text-muted)",
                  fontSize: 11, fontWeight: 800,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>{p.done ? "✓" : "·"}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: p.done ? "var(--color-text)" : "var(--color-text-2)" }}>
                  {p.name}
                  {p.req && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--color-accent)", marginLeft: 6 }}>필수</span>}
                </span>
                <span style={{ fontSize: 12, color: p.done ? "var(--color-primary)" : "var(--color-text-muted)", fontWeight: 700 }}>
                  {p.done ? "응답 완료" : "대기 중"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <Button block primary onClick={onSeeRecs}>지금까지의 추천 보기</Button>
        <button onClick={() => {}} style={{ background: "transparent", border: 0, color: "var(--color-text-2)", fontFamily: "inherit", fontSize: 13, padding: 6, cursor: "pointer" }}>
          링크 다시 보기
        </button>
      </div>
    </>
  );
}

/* ===== Wizard root =================================================== */
function Wizard({ onBack, onDone }) {
  const [step, setStep] = useWState(1);
  const [data, setData] = useWState({
    name: "6월 전시 모임",
    desc: "6월 초에 전시 보러 갈 사람들 일정 조율",
    kind: "friend",
    from: "2026.06.01",
    to:   "2026.06.14",
    due:  "2026.05.30 23:59",
    duration: "2h",
    windows: ["weekday-evening", "weekend-day"],
  });
  const set = (patch) => setData(d => ({ ...d, ...patch }));

  return (
    <div className="screen">
      <TopBar
        title={step === 5 ? data.name || "모임" : "모임 만들기"}
        onBack={() => (step === 1 ? onBack() : setStep(s => s - 1))}
      />
      {step < 5 && <StepBar current={step} />}

      {step === 1 && <Step1 data={data} set={set} onNext={() => setStep(2)} />}
      {step === 2 && <Step2 data={data} set={set} onNext={() => setStep(3)} />}
      {step === 3 && <Step3 data={data} set={set} onNext={() => setStep(4)} />}
      {step === 4 && <Step4 data={data}            onNext={() => setStep(5)} />}
      {step === 5 && <Step5 data={data}            onSeeRecs={onDone} />}
    </div>
  );
}

Object.assign(window, { Wizard });
