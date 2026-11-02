import type { User } from '@margi-ai/shared';

export interface MockUserRecord extends User {
  password: string;
}

export const MOCK_USERS: MockUserRecord[] = [
  {
    id: '0192e2b0-user-7000-8000-000000000001',
    email: 'demo@margi.test',
    password: 'Password123',
    name: 'Demo Traveler',
    avatarUrl: null,
    locale: 'en',
    role: 'USER',
    emailVerified: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: '0192e2b0-user-7000-8000-000000000002',
    email: 'unverified@margi.test',
    password: 'Password123',
    name: 'Unverified Explorer',
    avatarUrl: null,
    locale: 'id',
    role: 'USER',
    emailVerified: false,
    createdAt: '2026-08-10T10:00:00.000Z',
  },
  {
    id: '0192e2b0-user-7000-8000-000000000003',
    email: 'admin@margi.test',
    password: 'Password123',
    name: 'MARGI Admin Curator',
    avatarUrl: null,
    locale: 'en',
    role: 'ADMIN',
    emailVerified: true,
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

