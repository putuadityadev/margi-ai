import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { LoginInput, RegisterInput, UpdateProfileInput, User } from '@margi-ai/shared';
import { AppException } from '../common/app.exception';
import { AppConfig } from '../config/app-config.service';
import type { User as UserRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

export const AUTH_COOKIE = 'margi_auth';

/** Compared against when the email is unknown, so response timing does not reveal accounts. */
const DUMMY_HASH = `scrypt$AAAAAAAAAAAAAAAAAAAAAA==$${Buffer.alloc(64).toString('base64')}`;

const MAX_FAILED = 8;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Account sessions. A session is an opaque random token in an httpOnly cookie; only its SHA-256
 * is stored, so a database leak cannot be replayed. Sessions are revocable (logout) and slide
 * forward on `/auth/refresh`.
 */
@Injectable()
export class AuthService {
  /** Failed logins per `ip|email`, in memory (single instance MVP). */
  private readonly failures = new Map<string, { count: number; first: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  get sessionTtlMs(): number {
    return this.config.auth.refreshTtlDays * 24 * 60 * 60 * 1000;
  }

  toUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? '',
      avatarUrl: row.avatarUrl,
      locale: row.locale === 'id' ? 'id' : 'en',
      role: row.role,
      emailVerified: row.emailVerifiedAt !== null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async register(input: RegisterInput): Promise<UserRow> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppException(
        'CONFLICT',
        'An account with this email already exists',
        HttpStatus.CONFLICT,
      );
    }
    const isAdmin = this.config.auth.adminEmails.includes(email);
    return this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        role: isAdmin ? 'ADMIN' : 'USER',
      },
    });
  }

  async login(input: LoginInput, ip: string): Promise<UserRow> {
    const email = input.email.trim().toLowerCase();
    const key = `${ip}|${email}`;
    this.assertNotLocked(key);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) {
      this.recordFailure(key);
      throw new AppException(
        'UNAUTHORIZED',
        'Email or password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.failures.delete(key);
    return user;
  }

  /** Starts a session and returns the raw token for the cookie. */
  async startSession(
    user: UserRow,
    meta: { userAgent?: string | undefined; ip?: string | undefined },
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + this.sessionTtlMs),
        userAgent: meta.userAgent?.slice(0, 200) ?? null,
        ip: meta.ip ?? null,
      },
    });
    return token;
  }

  async resolve(token: string | undefined): Promise<UserRow | null> {
    if (!token) return null;
    const session = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
    return session.user;
  }

  /** Extends a live session; false when the token is not valid any more. */
  async refresh(token: string | undefined): Promise<boolean> {
    if (!token || !(await this.resolve(token))) return false;
    await this.prisma.refreshToken.update({
      where: { tokenHash: sha256(token) },
      data: { expiresAt: new Date(Date.now() + this.sessionTtlMs) },
    });
    return true;
  }

  async endSession(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserRow> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
      },
    });
  }

  private assertNotLocked(key: string): void {
    const entry = this.failures.get(key);
    if (!entry) return;
    if (Date.now() - entry.first > FAIL_WINDOW_MS) {
      this.failures.delete(key);
      return;
    }
    if (entry.count >= MAX_FAILED) {
      throw new AppException(
        'RATE_LIMITED',
        'Too many attempts. Try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string): void {
    const entry = this.failures.get(key);
    if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) {
      this.failures.set(key, { count: 1, first: Date.now() });
    } else {
      entry.count += 1;
    }
    if (this.failures.size > 5000) this.failures.clear();
  }
}
