// 인증 API — POST /api/auth/signup|login|logout, GET /api/auth/me
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginResult,
  ResetPasswordRequest,
  SignupRequest,
  WithdrawRequest,
} from "@whenwe/types";
import { apiPost, authDelete, authGet, authPost, saveToken, clearToken } from "./api";

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

export function requestPasswordReset(email: string): Promise<Record<string, never>> {
  const body: ForgotPasswordRequest = { email };
  return apiPost<Record<string, never>>("/api/auth/password/forgot", body);
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<Record<string, never>> {
  const body: ResetPasswordRequest = { token, newPassword };
  return apiPost<Record<string, never>>("/api/auth/password/reset", body);
}

export async function withdraw(password: string): Promise<Record<string, never>> {
  const body: WithdrawRequest = { password };
  const result = await authDelete<Record<string, never>>("/api/auth/me", body);
  clearToken();
  return result;
}
