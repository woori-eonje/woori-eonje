"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";
import { ApiError } from "@/lib/api";
import { deleteMeeting } from "@/lib/meetings";
import type { MeetingDetail } from "@whenwe/types";

// 모임장 관리 액션(수정/삭제). 대시보드(데스크톱)·status(모바일) 공용.
// 삭제는 언제든 가능. (수정은 #8 에서 추가 예정)
export function MeetingActions({ meeting }: { meeting: MeetingDetail }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMeeting(meeting.meetingId);
      router.push("/meetings");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "삭제 중 오류가 생겼어요.");
      setDeleting(false);
    }
  };

  return (
    <>
      <Button danger outline onClick={() => setConfirmOpen(true)}>
        삭제
      </Button>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setConfirmOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface)", borderRadius: 20,
              padding: 24, width: "100%", maxWidth: 360,
              display: "flex", flexDirection: "column", gap: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em" }}>
              모임을 삭제할까요?
            </h3>
            <p className="t-body2" style={{ margin: 0 }}>
              참여자 응답과 추천 결과까지 모두 사라져요. 되돌릴 수 없어요.
            </p>
            {error && (
              <p className="t-cap" style={{ color: "var(--color-error)", fontWeight: 600, margin: 0 }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Button block secondary disabled={deleting} onClick={() => setConfirmOpen(false)}>
                취소
              </Button>
              <Button block danger disabled={deleting} onClick={handleDelete}>
                {deleting ? "삭제 중…" : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
