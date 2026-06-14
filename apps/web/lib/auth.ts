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
