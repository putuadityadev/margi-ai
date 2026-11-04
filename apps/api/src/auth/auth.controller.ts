import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  LoginInputSchema,
  RegisterInputSchema,
  UpdateProfileInputSchema,
  type AuthResponse,
} from '@margi-ai/shared';
import { AppException } from '../common/app.exception';
import { parseInput } from '../common/parse-input';
import { AppConfig } from '../config/app-config.service';
import type { User as UserRow } from '../generated/prisma/client';
import { AuthGuard, CurrentUser } from './auth.guards';
import { AUTH_COOKIE, AuthService } from './auth.service';

function tokenOf(request: Request): string | undefined {
  return (request.cookies as Record<string, string | undefined> | undefined)?.[AUTH_COOKIE];
}

/** Email and password accounts with httpOnly cookie sessions (TDD §10.3). */
@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Post('auth/register')
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const user = await this.auth.register(parseInput(RegisterInputSchema, body));
    await this.open(user, request, response);
    return { user: this.auth.toUser(user) };
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const user = await this.auth.login(parseInput(LoginInputSchema, body), request.ip ?? '');
    await this.open(user, request, response);
    return { user: this.auth.toUser(user) };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.endSession(tokenOf(request));
    response.clearCookie(AUTH_COOKIE, this.cookieBase());
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: UserRow): AuthResponse {
    return { user: this.auth.toUser(user) };
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = tokenOf(request);
    if (!token || !(await this.auth.refresh(token))) {
      throw new AppException('UNAUTHORIZED', 'Session expired', HttpStatus.UNAUTHORIZED);
    }
    response.cookie(AUTH_COOKIE, token, { ...this.cookieBase(), maxAge: this.auth.sessionTtlMs });
  }

  @Patch('me/profile')
  @UseGuards(AuthGuard)
  async profile(@CurrentUser() user: UserRow, @Body() body: unknown): Promise<AuthResponse> {
    const updated = await this.auth.updateProfile(
      user.id,
      parseInput(UpdateProfileInputSchema, body),
    );
    return { user: this.auth.toUser(updated) };
  }

  private cookieBase() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.nodeEnv === 'production',
      path: '/',
    };
  }

  private async open(user: UserRow, request: Request, response: Response): Promise<void> {
    const token = await this.auth.startSession(user, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
    response.cookie(AUTH_COOKIE, token, { ...this.cookieBase(), maxAge: this.auth.sessionTtlMs });
  }
}
