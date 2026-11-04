import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
} from '@margi-ai/shared';
import { mockDb } from '../db';
import { getScenarioConfig } from '../scenario';

export const authHandlers: HttpHandler[] = [
  // POST /api/v1/auth/register
  http.post('*/api/v1/auth/register', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = RegisterInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Validation failed',
          },
        },
        { status: 400 },
      );
    }

    const { email, password, name } = parse.data;
    if (mockDb.getUserByEmail(email)) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'An account with this email address already exists',
          },
        },
        { status: 409 },
      );
    }

    const role: 'ADMIN' | 'USER' = email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER';
    const newUser = {
      id: `0192e2b0-user-${Date.now().toString(16).padStart(12, '0')}`,
      email,
      password,
      name,
      avatarUrl: null,
      locale: 'en' as const,
      role,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    mockDb.addUser(newUser);
    mockDb.currentUserId = newUser.id;

    // Send verification email
    const tok = mockDb.createEmailToken(email, 'VERIFY_EMAIL');
    mockDb.addSentEmail({
      to: email,
      subject: 'Verify your MARGI AI account',
      template: 'verify-email',
      token: tok.token,
    });

    const { password: _, ...safeUser } = newUser;
    return HttpResponse.json({ user: safeUser }, { status: 201 });
  }),

  // POST /api/v1/auth/login
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = LoginInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid credentials payload',
          },
        },
        { status: 400 },
      );
    }

    const { email, password } = parse.data;
    const user = mockDb.getUserByEmail(email);

    if (!user || user.password !== password) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 },
      );
    }

    mockDb.currentUserId = user.id;
    const { password: _, ...safeUser } = user;
    return HttpResponse.json({ user: safeUser }, { status: 200 });
  }),

  // POST /api/v1/auth/logout
  http.post('*/api/v1/auth/logout', () => {
    mockDb.currentUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/v1/auth/me
  http.get('*/api/v1/auth/me', () => {
    const { scenario } = getScenarioConfig();
    if (scenario === 'expired-session' && !mockDb.expiredSessionOnce) {
      mockDb.expiredSessionOnce = true;
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Session expired',
          },
        },
        { status: 401 },
      );
    }

    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 },
      );
    }

    const { password: _, ...safeUser } = user;
    return HttpResponse.json({ user: safeUser }, { status: 200 });
  }),

  // POST /api/v1/auth/refresh
  http.post('*/api/v1/auth/refresh', () => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Cannot refresh without active session',
          },
        },
        { status: 401 },
      );
    }

    const { password: _, ...safeUser } = user;
    return HttpResponse.json({ user: safeUser }, { status: 200 });
  }),

  // POST /api/v1/auth/verify-email
  http.post('*/api/v1/auth/verify-email', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = VerifyEmailInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid verification token format',
          },
        },
        { status: 400 },
      );
    }

    const result = mockDb.consumeEmailToken(parse.data.token, 'VERIFY_EMAIL');
    if (!result.success || !result.email) {
      return HttpResponse.json(
        {
          error: {
            code: result.error ?? 'AUTH_TOKEN_INVALID',
            message: 'Verification link is invalid or has expired',
          },
        },
        { status: 400 },
      );
    }

    const user = mockDb.getUserByEmail(result.email);
    if (user) {
      mockDb.updateUser(user.id, { emailVerified: true });
    }

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // POST /api/v1/auth/resend-verification
  http.post('*/api/v1/auth/resend-verification', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = ResendVerificationInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Valid email required',
          },
        },
        { status: 400 },
      );
    }

    const user = mockDb.getUserByEmail(parse.data.email);
    if (user && !user.emailVerified) {
      const tok = mockDb.createEmailToken(user.email, 'VERIFY_EMAIL');
      mockDb.addSentEmail({
        to: user.email,
        subject: 'Verify your MARGI AI account',
        template: 'verify-email',
        token: tok.token,
      });
    }

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // POST /api/v1/auth/forgot-password (always 204 enumeration-safe)
  http.post('*/api/v1/auth/forgot-password', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = ForgotPasswordInputSchema.safeParse(raw);
    if (parse.success) {
      const user = mockDb.getUserByEmail(parse.data.email);
      if (user) {
        const tok = mockDb.createEmailToken(user.email, 'RESET_PASSWORD');
        mockDb.addSentEmail({
          to: user.email,
          subject: 'Reset your MARGI AI password',
          template: 'reset-password',
          token: tok.token,
        });
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/auth/reset-password
  http.post('*/api/v1/auth/reset-password', async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parse = ResetPasswordInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid input',
          },
        },
        { status: 400 },
      );
    }

    const { token, password } = parse.data;
    const result = mockDb.consumeEmailToken(token, 'RESET_PASSWORD');
    if (!result.success || !result.email) {
      return HttpResponse.json(
        {
          error: {
            code: result.error ?? 'AUTH_TOKEN_INVALID',
            message: 'Reset token is invalid or has expired',
          },
        },
        { status: 400 },
      );
    }

    const user = mockDb.getUserByEmail(result.email);
    if (user) {
      mockDb.updateUser(user.id, { password });
    }

    return HttpResponse.json({ success: true }, { status: 200 });
  }),
];
