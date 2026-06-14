// 초대 진입 — 서버 컴포넌트에서 모임 공개 정보를 fetch(SSR)하고,
// 닉네임 입력 등 인터랙션은 client 뷰(InviteJoinView)로 분리한다.
import { Logo } from "@/components/primitives";
import { ApiError } from "@/lib/api";
import { fetchInvite, toInviteVM } from "@/lib/invite";
import type { InvitePublic } from "@whenwe/types";
import { InviteJoinView } from "./InviteJoinView";

function InfoScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="screen white">
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
        <Logo size={24} />
      </div>
      <div className="scroll center" style={{ padding: "40px 20px" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
          <h2 className="t-h2">{title}</h2>
          <p className="t-body2">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ConfirmedScreen({ dto }: { dto: InvitePublic }) {
  const startD = new Date(dto.startDate);
  const endD = new Date(dto.endDate);
  const dateRange = `${startD.getMonth() + 1}.${startD.getDate()} — ${endD.getMonth() + 1}.${endD.getDate()}`;

  return (
    <div className="screen white">
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
        <Logo size={24} />
      </div>
      <div className="scroll" style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          background: "var(--color-primary-soft)",
          border: "1px solid var(--color-primary)",
          borderRadius: 16, padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)", letterSpacing: "0.04em" }}>
            일정 확정됨
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>{dto.title}</div>
          {dto.description && <p className="t-body2">{dto.description}</p>}
        </div>

        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-line)",
          borderRadius: 16, padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div className="t-cap">조율 기간</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{dateRange}</div>
            </div>
            <div>
              <div className="t-cap">예상 소요</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{dto.durationHours}시간</div>
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--color-primary-soft)", borderRadius: 14,
          padding: "12px 16px", fontSize: 13, color: "var(--color-primary)", lineHeight: 1.6, fontWeight: 600,
        }}>
          🗓 확정된 시간 표시 준비 중이에요.
          <br />
          <span style={{ fontWeight: 400, color: "var(--color-text-2)" }}>
            모임장에게 확정 시간을 확인하거나, 잠시 후 다시 접속해 주세요.
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function InviteJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let dto: InvitePublic | null = null;
  let errorKind: "expired" | "invalid" | "error" = "error";
  try {
    dto = await fetchInvite(token);
  } catch (e) {
    if (e instanceof ApiError && e.code === "INVITE_TOKEN_EXPIRED") errorKind = "expired";
    else if (e instanceof ApiError && e.code === "INVITE_TOKEN_INVALID") errorKind = "invalid";
    else errorKind = "error";
  }

  if (!dto) {
    const errorText = {
      expired: { title: "마감된 초대 링크예요", body: "응답이 마감되어 더 이상 참여할 수 없어요." },
      invalid: { title: "유효하지 않은 초대 링크예요", body: "링크가 올바른지 다시 확인해 주세요." },
      error:   { title: "잠시 후 다시 시도해 주세요", body: "일시적인 오류로 모임 정보를 불러오지 못했어요." },
    }[errorKind];
    return <InfoScreen {...errorText} />;
  }

  if (dto.status === "CONFIRMED") {
    return <ConfirmedScreen dto={dto} />;
  }

  if (dto.status === "CLOSED") {
    return <InfoScreen title="종료된 모임이에요" body="이 모임은 이미 종료됐어요." />;
  }

  if (dto.status === "READY_TO_CONFIRM") {
    return <InfoScreen
      title="응답 수집이 마감됐어요"
      body="모임장이 최적의 시간을 검토하고 있어요. 확정되면 모임장에게 연락해 주세요."
    />;
  }

  return <InviteJoinView token={token} vm={toInviteVM(dto)} />;
}
