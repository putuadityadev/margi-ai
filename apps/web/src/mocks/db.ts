import type {
  AnalysisResult,
  CreatePresetInput,
  Regency,
  SavedTrip,
  CreateVenueInput,
  UpdateVenueInput,
} from '@margi-ai/shared';
import { MOCK_PRESETS } from './data/presets';
import { MOCK_REGENCIES } from './data/regencies';
import { MOCK_USERS, type MockUserRecord } from './data/users';
import { MOCK_VENUES, type MockVenueDetail } from './data/venues';
import type { TranscriptItem } from './pipeline/buildTranscript';

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

export interface MockAdminJob {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  done: number;
  total: number;
  errors: string[];
}

export interface MockSavedTripRecord extends SavedTrip {
  userId?: string;
}

export type UpdateVenueArg = {
  [K in keyof MockVenueDetail]?: MockVenueDetail[K] | undefined;
};

export type UpdateTripArg = {
  [K in keyof MockSavedTripRecord]?: MockSavedTripRecord[K] | undefined;
};

export type UpdateUserArg = {
  [K in keyof MockUserRecord]?: MockUserRecord[K] | undefined;
};

interface MockState {
  users: MockUserRecord[];
  currentUserId: string | null;
  guestSessionId: string;
  venues: MockVenueDetail[];
  presets: CreatePresetInput[];
  regencies: Regency[];
  analyses: Record<string, AnalysisResult>;
  transcripts: Record<string, TranscriptItem[]>;
  trips: MockSavedTripRecord[];
  sentEmails: MockSentEmail[];
  emailTokens: MockEmailToken[];
  jobs: Record<string, MockAdminJob>;
  expiredSessionOnce: boolean;
}

const STORAGE_KEY = 'margi_mock_db_state';

function loadInitialState(): MockState {
  return {
    users: [...MOCK_USERS],
    currentUserId: null,
    guestSessionId: '0192e2b0-sess-7000-8000-000000000001',
    venues: [...MOCK_VENUES],
    presets: [...MOCK_PRESETS],
    regencies: [...MOCK_REGENCIES],
    analyses: {},
    transcripts: {},
    trips: [
      {
        id: '0192e2b0-trip-7000-8000-000000000001',
        userId: '0192e2b0-user-7000-8000-000000000001',
        analysisId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f001',
        venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f002',
        msmeVenueIds: ['0192e2b0-8c20-7193-8db6-8d5ec4f0f004'],
        title: 'Morning Escape to Taman Ujung',
        note: 'Best visit before 11:00 WITA. Paired with Warung Babi Guling Ibu Oka.',
        createdAt: '2026-08-15T09:30:00.000Z',
      },
    ],
    sentEmails: [],
    emailTokens: [],
    jobs: {},
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

  // Venues & Catalog
  get venues(): readonly MockVenueDetail[] {
    return this.state.venues;
  }

  getVenueBySlug(slug: string): MockVenueDetail | undefined {
    return this.state.venues.find((v) => v.slug === slug);
  }

  getVenueById(id: string): MockVenueDetail | undefined {
    return this.state.venues.find((v) => v.id === id);
  }

  addVenue(input: CreateVenueInput & { id?: string }): MockVenueDetail {
    const venueId = input.id ?? `0192e2b0-ven-${Date.now().toString(16).padStart(12, '0')}`;
    const newVenue: MockVenueDetail = {
      ...input,
      id: venueId,
      vibeProfile: {
        isTravelScene: true,
        sceneSummary: 'Scenic venue in Bali',
        topography: { label: 'Hills', descriptors: ['hills', 'scenic'], intensity: 0.7 },
        architecture: { label: 'Traditional', descriptors: ['traditional', 'balinese'], intensity: 0.65 },
        lighting: { label: 'Golden hour', descriptors: ['golden', 'warm'], intensity: 0.8 },
        activity: { label: 'Sightseeing', descriptors: ['sightseeing', 'walk'], intensity: 0.5 },
        visualDensity: { label: 'Spacious', descriptors: ['spacious', 'open'], intensity: 0.45 },
        detectedLandmarkGuess: null,
        confidence: 0.92,
      },
    };
    this.state.venues.push(newVenue);
    this.persist();
    return newVenue;
  }

  updateVenue(id: string, partial: UpdateVenueArg): MockVenueDetail | undefined {
    const venue = this.state.venues.find((v) => v.id === id);
    if (!venue) return undefined;
    Object.assign(venue, partial);
    this.persist();
    return venue;
  }

  deleteVenue(id: string): boolean {
    const venue = this.state.venues.find((v) => v.id === id);
    if (!venue) return false;
    venue.isActive = false;
    this.persist();
    return true;
  }

  // Presets & Regencies
  get presets(): readonly CreatePresetInput[] {
    return this.state.presets;
  }

  getPresetById(id: string): CreatePresetInput | undefined {
    return this.state.presets.find((p) => p.id === id);
  }

  addPreset(preset: CreatePresetInput): void {
    this.state.presets.push(preset);
    this.persist();
  }

  updatePreset(id: string, partial: Partial<CreatePresetInput>): CreatePresetInput | undefined {
    const p = this.state.presets.find((x) => x.id === id);
    if (!p) return undefined;
    Object.assign(p, partial);
    this.persist();
    return p;
  }

  deletePreset(id: string): boolean {
    const idx = this.state.presets.findIndex((x) => x.id === id);
    if (idx >= 0) {
      this.state.presets.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  get regencies(): readonly Regency[] {
    return this.state.regencies;
  }

  // Analyses
  saveAnalysis(result: AnalysisResult): void {
    this.state.analyses[result.id] = result;
    this.persist();
  }

  getAnalysis(id: string): AnalysisResult | undefined {
    return this.state.analyses[id];
  }

  getUserAnalyses(userId?: string): AnalysisResult[] {
    const results = Object.values(this.state.analyses);
    if (!userId) return results;
    // For mock, return all or seeded analyses
    return results;
  }

  deleteAnalysis(id: string): boolean {
    if (this.state.analyses[id]) {
      delete this.state.analyses[id];
      delete this.state.transcripts[id];
      this.persist();
      return true;
    }
    return false;
  }

  deleteAllAnalyses(): void {
    this.state.analyses = {};
    this.state.transcripts = {};
    this.persist();
  }

  saveTranscript(id: string, transcript: TranscriptItem[]): void {
    this.state.transcripts[id] = transcript;
    this.persist();
  }

  getTranscript(id: string): TranscriptItem[] | undefined {
    return this.state.transcripts[id];
  }

  // Trips
  get trips(): readonly MockSavedTripRecord[] {
    return this.state.trips;
  }

  getTripsForUser(userId: string): MockSavedTripRecord[] {
    return this.state.trips.filter((t) => t.userId === userId);
  }

  getTripById(id: string): MockSavedTripRecord | undefined {
    return this.state.trips.find((t) => t.id === id);
  }

  saveTrip(trip: Omit<MockSavedTripRecord, 'id' | 'createdAt'>): MockSavedTripRecord {
    const entry: MockSavedTripRecord = {
      ...trip,
      id: `0192e2b0-trip-${Date.now().toString(16).padStart(12, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.trips.unshift(entry);
    this.persist();
    return entry;
  }

  updateTrip(id: string, partial: UpdateTripArg): MockSavedTripRecord | undefined {
    const trip = this.state.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    Object.assign(trip, partial, { updatedAt: new Date().toISOString() });
    this.persist();
    return trip;
  }

  deleteTrip(id: string): boolean {
    const idx = this.state.trips.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.state.trips.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // Admin Jobs (re-embed-all)
  createJob(total: number): MockAdminJob {
    const id = `job-${Date.now()}`;
    const job: MockAdminJob = {
      id,
      status: 'RUNNING',
      done: 0,
      total,
      errors: [],
    };
    this.state.jobs[id] = job;
    this.persist();
    return job;
  }

  getJob(id: string): MockAdminJob | undefined {
    const job = this.state.jobs[id];
    if (!job) return undefined;
    if (job.status === 'RUNNING') {
      job.done = Math.min(job.total, job.done + 12);
      if (job.done >= job.total) {
        job.status = 'COMPLETED';
      }
      this.persist();
    }
    return job;
  }

  reset(): void {
    this.state = loadInitialState();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const mockDb = new MockDatabase();
