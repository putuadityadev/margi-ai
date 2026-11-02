import type { AnalysisResult, CreatePresetInput, Regency } from '@margi-ai/shared';
import { MOCK_PRESETS } from './data/presets';
import { MOCK_REGENCIES } from './data/regencies';
import { MOCK_VENUES, type MockVenueDetail } from './data/venues';

export interface MockSentEmail {
  readonly id: string;
  readonly to: string;
  readonly subject: string;
  readonly template: string;
  readonly token?: string;
  readonly sentAt: string;
}

export interface MockSavedTrip {
  readonly id: string;
  readonly analysisId: string;
  readonly venueId: string;
  readonly msmeVenueIds: string[];
  readonly title: string;
  readonly note?: string;
  readonly createdAt: string;
}

interface MockState {
  venues: MockVenueDetail[];
  presets: CreatePresetInput[];
  regencies: Regency[];
  analyses: Record<string, AnalysisResult>;
  trips: MockSavedTrip[];
  sentEmails: MockSentEmail[];
}

const STORAGE_KEY = 'margi_mock_db_state';

function loadInitialState(): MockState {
  return {
    venues: [...MOCK_VENUES],
    presets: [...MOCK_PRESETS],
    regencies: [...MOCK_REGENCIES],
    analyses: {},
    trips: [],
    sentEmails: [],
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

  get venues(): readonly MockVenueDetail[] {
    return this.state.venues;
  }

  get presets(): readonly CreatePresetInput[] {
    return this.state.presets;
  }

  get regencies(): readonly Regency[] {
    return this.state.regencies;
  }

  get sentEmails(): readonly MockSentEmail[] {
    return this.state.sentEmails;
  }

  get trips(): readonly MockSavedTrip[] {
    return this.state.trips;
  }

  getVenueBySlug(slug: string): MockVenueDetail | undefined {
    return this.state.venues.find((v) => v.slug === slug);
  }

  getVenueById(id: string): MockVenueDetail | undefined {
    return this.state.venues.find((v) => v.id === id);
  }

  getPresetById(id: string): CreatePresetInput | undefined {
    return this.state.presets.find((p) => p.id === id);
  }

  saveAnalysis(result: AnalysisResult): void {
    this.state.analyses[result.id] = result;
    this.persist();
  }

  getAnalysis(id: string): AnalysisResult | undefined {
    return this.state.analyses[id];
  }

  addSentEmail(email: Omit<MockSentEmail, 'id' | 'sentAt'>): MockSentEmail {
    const entry: MockSentEmail = {
      ...email,
      id: `email-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
    this.state.sentEmails.push(entry);
    this.persist();
    return entry;
  }

  saveTrip(trip: Omit<MockSavedTrip, 'id' | 'createdAt'>): MockSavedTrip {
    const entry: MockSavedTrip = {
      ...trip,
      id: `trip-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.state.trips.push(entry);
    this.persist();
    return entry;
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

  reset(): void {
    this.state = loadInitialState();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const mockDb = new MockDatabase();
