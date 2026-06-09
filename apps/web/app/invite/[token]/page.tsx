// 초대 진입 — 서버 컴포넌트에서 모임 공개 정보를 fetch(SSR)하고,
// 닉네임 입력 등 인터랙션은 client 뷰(InviteJoinView)로 분리한다.
import { Logo } from "@/components/primitives";
import { ApiError } from "@/lib/api";
import { fetchInvite, toInviteVM, type InviteVM } from "@/lib/invite";
import { InviteJoinView } from "./InviteJoinView";

export default async function InviteJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // fetch 실패만 잡는다(렌더 에러를 삼키지 않도록 JSX 반환은 try/catch 밖에서).
  // 토큰 문제(invalid/expired)와 일시적 오류(네트워크/서버)를 구분한다.
  let vm: InviteVM | null = null;
  let errorKind: "expired" | "invalid" | "error" = "error";
  try {
    vm = toInviteVM(await fetchInvite(token));
  } catch (e) {
    if (e instanceof ApiError && e.code === "INVITE_TOKEN_EXPIRED") errorKind = "expired";
    else if (e instanceof ApiError && e.code === "INVITE_TOKEN_INVALID") errorKind = "invalid";
    else errorKind = "error";
  }

  if (vm) {
    return <InviteJoinView token={token} vm={vm} />;
  }

  const errorText = {
    expired: { title: "마감된 초대 링크예요", body: "응답이 마감되어 더 이상 참여할 수 없어요." },
    invalid: { title: "유효하지 않은 초대 링크예요", body: "링크가 올바른지 다시 확인해 주세요." },
    error: { title: "잠시 후 다시 시도해 주세요", body: "일시적인 오류로 모임 정보를 불러오지 못했어요." },
  }[errorKind];

  return (
    <div className="screen white">
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center" }}>
          <Logo size={24} />
        </div>
        <div className="scroll center" style={{ padding: "40px 20px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
            <h2 className="t-h2">{errorText.title}</h2>
            <p className="t-body2">{errorText.body}</p>
          </div>
        </div>
      </div>
    );
}
