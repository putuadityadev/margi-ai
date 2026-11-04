import { Controller, Get, HttpStatus, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from '../common/app.exception';
import { AppConfig } from '../config/app-config.service';
import { AUTH_COOKIE, AuthService } from './auth.service';
import { GoogleAuthService, type OAuthTransaction } from './google-auth.service';

const OAUTH_COOKIE = 'margi_oauth';
const OAUTH_PATH = '/api/v1/auth/google';
const OAUTH_TTL_MS = 10 * 60 * 1000;

/** "Continue with Google". Both routes are plain browser navigations (GET), not XHR. */
@Controller()
export class GoogleAuthController {
  constructor(
    private readonly google: GoogleAuthService,
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  /** Lets the web app show the Google button only when the server has credentials for it. */
  @Get('auth/providers')
  providers(): { google: boolean } {
    return { google: this.google.isConfigured };
  }

  @Get('auth/google')
  start(@Query('next') next: unknown, @Res() response: Response): void {
    if (!this.google.isConfigured) {
      throw new AppException(
        'SERVICE_UNAVAILABLE',
        'Google sign-in is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const { url, transaction } = this.google.begin(next);
    response.cookie(OAUTH_COOKIE, JSON.stringify(transaction), {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
      path: OAUTH_PATH,
      maxAge: OAUTH_TTL_MS,
    });
    response.redirect(url);
  }

  @Get('auth/google/callback')
  async callback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const failure = `${this.config.appUrl}/login?error=google`;
    const raw = (request.cookies as Record<string, string | undefined> | undefined)?.[OAUTH_COOKIE];
    response.clearCookie(OAUTH_COOKIE, { path: OAUTH_PATH });

    let transaction: OAuthTransaction | null = null;
    try {
      transaction = raw ? (JSON.parse(raw) as OAuthTransaction) : null;
    } catch {
      transaction = null;
    }
    if (!transaction || typeof code !== 'string' || state !== transaction.state) {
      response.redirect(failure);
      return;
    }

    const user = await this.google.complete(code, transaction);
    if (!user) {
      response.redirect(failure);
      return;
    }
    const token = await this.auth.startSession(user, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
    response.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
      path: '/',
      maxAge: this.auth.sessionTtlMs,
    });
    response.redirect(`${this.config.appUrl}${transaction.next}`);
  }
}
