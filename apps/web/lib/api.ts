// 타입드 API 클라이언트 — 계약(@whenwe/types ApiResponse 봉투)을 풀어 data 만 반환.
// 실패 봉투는 ApiError 로 throw 한다. (2층 구조의 '경계' — 계약 ↔ 화면 사이)
import type { ApiResponse } from "@whenwe/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TOKEN_KEY = "whenwe:token";

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

// ── JWT 토큰 관리 ──────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── 공통 fetch ──────────────────────────────────────────────────
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
    const err = new ApiError(body.error.code, body.error.message, res.status);
    if (err.code === "UNAUTHENTICATED" && typeof window !== "undefined") {
      clearToken();
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw err;
  }
  return body.data;
}

// ── 비인증 요청 ─────────────────────────────────────────────────
export function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  return request<T>(path, { headers });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ── 인증(Bearer) 요청 ───────────────────────────────────────────
function bearerHeader(): Record<string, string> {
  const token = getToken();
  if (!token) throw new ApiError("UNAUTHENTICATED", "로그인이 필요해요.", 401);
  return { Authorization: `Bearer ${token}` };
}

export function authGet<T>(path: string): Promise<T> {
  return request<T>(path, { headers: bearerHeader() });
}

export function authPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearerHeader() },
    body: JSON.stringify(body),
  });
}

export function authPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...bearerHeader() },
    body: JSON.stringify(body),
  });
}
