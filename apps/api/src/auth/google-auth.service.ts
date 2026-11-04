import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfig } from '../config/app-config.service';
import type { User as UserRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const TIMEOUT_MS = 8_000;

const TokenResponseSchema = z.object({ id_token: z.string().min(10) });
const ClaimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.literal('true')]).optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

/** Where the sign-in started and the secrets that bind the callback to this browser. */
export interface OAuthTransaction {
  readonly state: string;
  readonly verifier: string;
  /** Path inside the web app to return to, already sanitised. */
  readonly next: string;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

/** Only same-site relative paths are allowed, so the redirect can never leave the app. */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 300) return '/app';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/app';
  return raw;
}

/**
 * "Continue with Google" through the OAuth 2.0 authorization code flow with PKCE. The ID token
 * is obtained directly from Google's token endpoint over TLS and its issuer, audience, expiry
 * and verified email are checked here. A Google account links to an existing account with the
 * same (Google-verified) email, so nobody ends up with two accounts.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  get isConfigured(): boolean {
    const { googleClientId, googleClientSecret, googleCallbackUrl } = this.config.auth;
    return Boolean(googleClientId && googleClientSecret && googleCallbackUrl);
  }

  /** Builds Google's consent URL and the transaction to keep in a short-lived cookie. */
  begin(nextRaw: unknown): { url: string; transaction: OAuthTransaction } {
    const { googleClientId, googleCallbackUrl } = this.config.auth;
    const transaction: OAuthTransaction = {
      state: base64Url(randomBytes(24)),
      verifier: base64Url(randomBytes(32)),
      next: safeNextPath(nextRaw),
    };
    const challenge = base64Url(createHash('sha256').update(transaction.verifier).digest());
    const params = new URLSearchParams({
      client_id: googleClientId ?? '',
      redirect_uri: googleCallbackUrl ?? '',
      response_type: 'code',
      scope: 'openid email profile',
      state: transaction.state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return { url: `${AUTH_URL}?${params.toString()}`, transaction };
  }

  /** Completes the sign-in; returns null for any failure (the caller shows one generic error). */
  async complete(code: string, transaction: OAuthTransaction): Promise<UserRow | null> {
    try {
      const claims = await this.exchange(code, transaction.verifier);
      if (!claims) return null;
      return await this.upsertUser(claims);
    } catch (error: unknown) {
      this.logger.warn(
        { detail: error instanceof Error ? error.message : 'unknown' },
        'Google sign-in failed',
      );
      return null;
    }
  }

  private async exchange(
    code: string,
    verifier: string,
  ): Promise<z.infer<typeof ClaimsSchema> | null> {
    const { googleClientId, googleClientSecret, googleCallbackUrl } = this.config.auth;
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId ?? '',
        client_secret: googleClientSecret ?? '',
        redirect_uri: googleCallbackUrl ?? '',
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      this.logger.warn({ status: response.status }, 'Google token exchange rejected');
      return null;
    }
    const { id_token: idToken } = TokenResponseSchema.parse(await response.json());
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const claims = ClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')),
    );
    const verified = claims.email_verified === true || claims.email_verified === 'true';
    if (
      !ISSUERS.has(claims.iss) ||
      claims.aud !== googleClientId ||
      claims.exp * 1000 < Date.now() ||
      !verified
    ) {
      this.logger.warn('Google ID token failed validation');
      return null;
    }
    return claims;
  }

  private async upsertUser(claims: z.infer<typeof ClaimsSchema>): Promise<UserRow> {
    const email = claims.email.toLowerCase();
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: claims.sub } },
      include: { user: true },
    });
    if (linked) return this.promoteIfAdmin(linked.user);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          email,
          name: claims.name?.slice(0, 100) ?? email.split('@')[0] ?? '',
          avatarUrl: claims.picture ?? null,
          emailVerifiedAt: new Date(),
          role: this.config.auth.adminEmails.includes(email) ? 'ADMIN' : 'USER',
        },
      }));
    await this.prisma.oAuthAccount.create({
      data: { userId: user.id, provider: 'google', providerAccountId: claims.sub },
    });
    // Google has verified this address, so an existing password account is now verified too.
    const verified = user.emailVerifiedAt
      ? user
      : await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });
    return this.promoteIfAdmin(verified);
  }

  private async promoteIfAdmin(user: UserRow): Promise<UserRow> {
    if (user.role !== 'ADMIN' && this.config.auth.adminEmails.includes(user.email)) {
      return this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }
    return user;
  }
}
