// 타입드 API 클라이언트 — 계약(@whenwe/types ApiResponse 봉투)을 풀어 data 만 반환.
// 실패 봉투는 ApiError 로 throw 한다. (2층 구조의 '경계' — 계약 ↔ 화면 사이)
import type { ApiResponse } from "@whenwe/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("NETWORK_ERROR", "서버에 연결할 수 없어요.", 0);
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) {
    throw new ApiError("BAD_RESPONSE", "서버 응답을 해석할 수 없어요.", res.status);
  }
  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, res.status);
  }
  return body.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, {});
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
