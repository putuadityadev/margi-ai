import type { AdminStats } from '@margi-ai/shared';

export const MOCK_ADMIN_STATS: AdminStats = {
  analysesPerDay: [
    { date: '2026-08-10', count: 42 },
    { date: '2026-08-11', count: 68 },
    { date: '2026-08-12', count: 95 },
    { date: '2026-08-13', count: 124 },
    { date: '2026-08-14', count: 180 },
    { date: '2026-08-15', count: 245 },
    { date: '2026-08-16', count: 310 },
  ],
  durationMs: {
    p50: 4200,
    p95: 7800,
  },
  tierDistribution: {
    LIVE: 48,
    FORECAST: 42,
    SIMULATION: 10,
  },
  llmFallbackRatio: 0.04,
  replayCount: 7,
  topRecommendedVenues: [
    { venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f002', name: 'Taman Ujung Sukasada', count: 142 },
    { venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f003', name: 'Tirta Gangga Water Palace', count: 118 },
    { venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f005', name: 'Pura Besakih Complex', count: 94 },
    { venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f004', name: 'Warung Babi Guling Ibu Oka', count: 87 },
  ],
  navigateClicks: {
    DTW: 384,
    MSME: 192,
  },
};

