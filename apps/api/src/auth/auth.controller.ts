import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResult,
  ResetPasswordRequest,
  SignupRequest,
  WithdrawRequest,
} from '@whenwe/types';
import { AuthService } from './auth.service';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/signup — 회원가입 (인증 불필요)
  @Post('signup')
  @HttpCode(201)
  signup(@Body() body: SignupRequest): Promise<AuthUser> {
    return this.authService.signup(body);
  }

  // POST /api/auth/login — 로그인, JWT 발급 (인증 불필요)
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequest): Promise<LoginResult> {
    return this.authService.login(body);
  }

  // GET /api/auth/me — 현재 로그인 사용자 (JWT 필요)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: AuthenticatedRequest): Promise<AuthUser> {
    return this.authService.getMe(req.user.id);
  }

  // POST /api/auth/logout — 로그아웃 (JWT 필요). 무상태 JWT 이므로 서버는 빈 응답만.
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(): Record<string, never> {
    return {};
  }

  // POST /api/auth/password/forgot — 비밀번호 재설정 메일 요청 (인증 불필요)
  // IP 단위 5회/분 제한. 계정 존재 여부와 무관하게 항상 동일한 응답을 반환한다.
  @Post('password/forgot')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgotPassword(
    @Body() body: ForgotPasswordRequest,
  ): Promise<Record<string, never>> {
    return this.authService.forgotPassword(body?.email);
  }

  // POST /api/auth/password/reset — 새 비밀번호 설정 (인증 불필요, 토큰으로 검증)
  @Post('password/reset')
  @HttpCode(200)
  resetPassword(
    @Body() body: ResetPasswordRequest,
  ): Promise<Record<string, never>> {
    return this.authService.resetPassword(body?.token, body?.newPassword);
  }

  // DELETE /api/auth/me — 회원 탈퇴 (JWT 필요). 비밀번호 재확인 후 삭제.
  @Delete('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  withdraw(
    @Req() req: AuthenticatedRequest,
    @Body() body: WithdrawRequest,
  ): Promise<Record<string, never>> {
    return this.authService.withdraw(req.user.id, body?.password);
  }
}
