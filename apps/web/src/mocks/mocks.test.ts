import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from './node';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW mock layer', () => {
  describe('T-084 · Auth Mock Handlers', () => {
    it('authenticates demo user with valid credentials', async () => {
      const res = await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'Password123' }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        user: { email: string; role: string; emailVerified: boolean };
      };
      expect(data.user.email).toBe('demo@margi.test');
      expect(data.user.role).toBe('USER');
      expect(data.user.emailVerified).toBe(true);
    });

    it('rejects invalid password with 401 UNAUTHORIZED', async () => {
      const res = await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'WrongPassword' }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects registration with existing email with 409 CONFLICT', async () => {
      const res = await fetch('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@margi.test',
          password: 'Password123',
          name: 'Duplicate',
        }),
      });

      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONFLICT');
    });

    it('returns 204 for forgot password regardless of email existence', async () => {
      const res = await fetch('http://localhost/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      expect(res.status).toBe(204);
    });

    it('rejects invalid or reused email verification token', async () => {
      const res = await fetch('http://localhost/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'fake-token-123' }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });
});
