import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthUser,
  LoginRequest,
  LoginResult,
  SignupRequest,
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
}
