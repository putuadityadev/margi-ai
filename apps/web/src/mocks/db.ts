import { MOCK_USERS, type MockUserRecord } from './data/users';

export interface MockSentEmail {
  readonly id: string;
  readonly to: string;
  readonly subject: string;
  readonly template: string;
  readonly token?: string;
  readonly sentAt: string;
}

export interface MockEmailToken {
  token: string;
  email: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  usedAt: string | null;
  expiresAt: string;
}

export type UpdateUserArg = {
  [K in keyof MockUserRecord]?: MockUserRecord[K] | undefined;
};

interface MockState {
  users: MockUserRecord[];
  currentUserId: string | null;
  guestSessionId: string;
  sentEmails: MockSentEmail[];
  emailTokens: MockEmailToken[];
  expiredSessionOnce: boolean;
}

const STORAGE_KEY = 'margi_mock_db_state';

function loadInitialState(): MockState {
  return {
    users: MOCK_USERS.map((u) => ({ ...u })),
    currentUserId: null,
    guestSessionId: '0192e2b0-sess-7000-8000-000000000001',
    sentEmails: [],
    emailTokens: [],
    expiredSessionOnce: false,
  };
}

class MockDatabase {
  private state: MockState;

  constructor() {
    this.state = this.restore();
  }

  private restore(): MockState {
    if (typeof window === 'undefined') {
      return loadInitialState();
    }
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as MockState;
      }
    } catch {
      // Fallback on storage errors
    }
    return loadInitialState();
  }

  private persist(): void {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // Ignore session storage quota errors
      }
    }
  }

  // Users & Auth
  get users(): readonly MockUserRecord[] {
    return this.state.users;
  }

  get currentUserId(): string | null {
    return this.state.currentUserId;
  }

  set currentUserId(id: string | null) {
    this.state.currentUserId = id;
    this.persist();
  }

  get guestSessionId(): string {
    return this.state.guestSessionId;
  }

  getCurrentUser(): MockUserRecord | null {
    if (!this.state.currentUserId) return null;
    return this.state.users.find((u) => u.id === this.state.currentUserId) ?? null;
  }

  getUserByEmail(email: string): MockUserRecord | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): MockUserRecord | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  addUser(user: MockUserRecord): void {
    this.state.users.push(user);
    this.persist();
  }

  updateUser(id: string, partial: UpdateUserArg): MockUserRecord | undefined {
    const user = this.state.users.find((u) => u.id === id);
    if (!user) return undefined;
    Object.assign(user, partial);
    this.persist();
    return user;
  }

  // Tokens & Email
  createEmailToken(email: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): MockEmailToken {
    const token = `tok_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresHours = type === 'VERIFY_EMAIL' ? 24 : 0.5;
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const record: MockEmailToken = {
      token,
      email,
      type,
      usedAt: null,
      expiresAt,
    };
    this.state.emailTokens.push(record);
    this.persist();
    return record;
  }

  consumeEmailToken(token: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): { success: boolean; email?: string; error?: string } {
    const record = this.state.emailTokens.find((t) => t.token === token && t.type === type);
    if (!record) {
      return { success: false, error: 'AUTH_TOKEN_INVALID' };
    }
    if (record.usedAt) {
      return { success: false, error: 'AUTH_TOKEN_INVALID' };
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'AUTH_TOKEN_EXPIRED' };
    }

    record.usedAt = new Date().toISOString();
    this.persist();
    return { success: true, email: record.email };
  }

  get emailTokens(): readonly MockEmailToken[] {
    return this.state.emailTokens;
  }

  addSentEmail(email: Omit<MockSentEmail, 'id' | 'sentAt'>): MockSentEmail {
    const entry: MockSentEmail = {
      ...email,
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    this.state.sentEmails.push(entry);
    this.persist();
    return entry;
  }

  get sentEmails(): readonly MockSentEmail[] {
    return this.state.sentEmails;
  }

  // Expired session scenario flag
  get expiredSessionOnce(): boolean {
    return this.state.expiredSessionOnce;
  }

  set expiredSessionOnce(val: boolean) {
    this.state.expiredSessionOnce = val;
    this.persist();
  }

  reset(): void {
    this.state = loadInitialState();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const mockDb = new MockDatabase();
