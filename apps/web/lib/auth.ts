// 인증 API — POST /api/auth/signup|login|logout, GET /api/auth/me
import type { AuthUser, LoginResult, SignupRequest } from "@whenwe/types";
import { apiPost, authGet, authPost, saveToken, clearToken } from "./api";

export async function signup(email: string, password: string, nickname: string): Promise<AuthUser> {
  const body: SignupRequest = { email, password, nickname };
  return apiPost<AuthUser>("/api/auth/signup", body);
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>("/api/auth/login", { email, password });
  saveToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await authPost<Record<string, never>>("/api/auth/logout", {});
  } finally {
    clearToken();
  }
}

export function getMe(): Promise<AuthUser> {
  return authGet<AuthUser>("/api/auth/me");
}

// 비밀번호 재설정 API는 백엔드 구현 전에도 화면과 호출 경계를 먼저 맞출 수 있도록
// 이 파일에 로컬 요청 타입으로 둔다. OpenAPI 확정 후 @whenwe/types로 이동한다.
export function requestPasswordReset(email: string): Promise<Record<string, never>> {
  return apiPost<Record<string, never>>("/api/auth/password/forgot", { email });
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<Record<string, never>> {
  return apiPost<Record<string, never>>("/api/auth/password/reset", {
    token,
    newPassword,
  });
}
