import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import '../../lib/i18n';
import type { AnalysisResult } from '@margi-ai/shared';
import { AppProviders } from '../../app/providers';
import { ResultDashboard } from './ResultDashboard';
import { useStreamStore } from '../../stores/streamStore';

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-popup">{children}</div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

const mockResult: AnalysisResult = {
  id: '0192e2b0-res-7000-8000-000000000001',
  status: 'COMPLETED',
  locale: 'en',
  simulate: true,
  simulation: {
    virtualTime: '2026-08-15T09:00:00+08:00',
    surgePct: 65,
  },
  input: {
    presetId: 'lempuyang-morning',
    origin: {
      id: '0192e2b0-orig-7000-8000-000000000001',
      slug: 'pura-lempuyang',
      kind: 'DTW',
      category: 'TEMPLE',
      nameEn: 'Pura Lempuyang',
      nameId: 'Pura Lempuyang',
      descriptionEn: 'Famous mountain gate',
      descriptionId: 'Pura gerbang terbelah',
      regencyId: 'regency-karangasem',
      lat: -8.39,
      lng: 115.62,
      imageUrl: '/venues/lempuyang.webp',
      isHotspot: true,
      isBufferZone: false,
    },
    arrivalAt: '2026-08-15T09:00:00+08:00',
  },
  vibe: {
    isTravelScene: true,
    sceneSummary: 'Sacred mountain temple with split stone gate',
    topography: { label: 'Mountain', descriptors: ['high', 'mist'], intensity: 0.9 },
    architecture: { label: 'Temple', descriptors: ['stone', 'candi'], intensity: 0.85 },
    lighting: { label: 'Morning Sun', descriptors: ['bright', 'soft'], intensity: 0.75 },
    activity: { label: 'Spiritual', descriptors: ['serene', 'calm'], intensity: 0.6 },
    visualDensity: { label: 'Medium', descriptors: ['open'], intensity: 0.5 },
    detectedLandmarkGuess: 'Pura Lempuyang',
    confidence: 0.94,
  },
  origin: {
    venue: {
      id: '0192e2b0-orig-7000-8000-000000000001',
      slug: 'pura-lempuyang',
      kind: 'DTW',
      category: 'TEMPLE',
      nameEn: 'Pura Lempuyang',
      nameId: 'Pura Lempuyang',
      descriptionEn: 'Famous mountain gate',
      descriptionId: 'Pura gerbang terbelah',
      regencyId: 'regency-karangasem',
      lat: -8.39,
      lng: 115.62,
      imageUrl: '/venues/lempuyang.webp',
      isHotspot: true,
      isBufferZone: false,
    },
    snapshot: {
      busynessNow: 95,
      forecastNow: 95,
      forecastPlus2: 98,
      bEff: 95,
      tier: 'SIMULATION',
      synthetic: true,
      hourlyCurve: Array(24).fill(90) as number[],
      arrivalHours: [9],
      departureHours: [10],
      isOpen: true,
    },
    cfs: 96,
    redZone: true,
    queueEstimateMin: 210,
  },
  insight: 'Extreme photo queue exceeding 3.5 hours detected at origin.',
  micro: [
    {
      venue: {
        id: '0192e2b0-alt-7000-8000-000000000001',
        slug: 'pura-kehen',
        kind: 'DTW',
        category: 'TEMPLE',
        nameEn: 'Pura Kehen',
        nameId: 'Pura Kehen',
        descriptionEn: 'Serene terraced stone sanctuary',
        descriptionId: 'Pura bertingkat tenang di Bangli',
        regencyId: 'regency-bangli',
        lat: -8.435,
        lng: 115.356,
        imageUrl: '/venues/kehen.webp',
        isHotspot: false,
        isBufferZone: false,
        regency: {
          id: 'regency-bangli',
          nameEn: 'Bangli',
          nameId: 'Bangli',
          phrStatus: 'RECIPIENT',
        },
        distanceKm: 2.4,
        travelMinEstimate: 12,
      },
      simVibe: 86,
      topMatchingDimensions: ['Sacred Stone', 'Tiered Temple'],
      cfs: 25,
      rank: 84.5,
      fiscalBoost: true,
      snapshot: {
        busynessNow: 20,
        forecastNow: 22,
        forecastPlus2: 25,
        bEff: 22,
        tier: 'SIMULATION',
        synthetic: true,
        hourlyCurve: Array(24).fill(22) as number[],
        arrivalHours: [9],
        departureHours: [10],
        isOpen: true,
      },
      whyItMatches: 'Offers identical stone carvings without commercial bus tours.',
      bestTimeTip: 'Visit before 10:00 WITA.',
      msme: [
        {
          venue: {
            id: '0192e2b0-msme-7000-8000-000000000001',
            slug: 'warung-kehen',
            kind: 'MSME',
            category: 'CULINARY',
            nameEn: 'Warung Sari Kehen',
            nameId: 'Warung Sari Kehen',
            descriptionEn: 'Authentic mujair nyat-nyat',
            descriptionId: 'Mujair nyat-nyat khas Bangli',
            regencyId: 'regency-bangli',
            lat: -8.436,
            lng: 115.357,
            imageUrl: '/venues/warung-gurame.webp',
            isHotspot: false,
            isBufferZone: false,
            distanceKm: 0.3,
          },
          simVibe: 79,
          snapshot: {
            busynessNow: 15,
            forecastNow: 18,
            forecastPlus2: 20,
            bEff: 18,
            tier: 'SIMULATION',
            synthetic: true,
            hourlyCurve: Array(24).fill(18) as number[],
            arrivalHours: [11],
            departureHours: [12],
            isOpen: true,
          },
          pairingReason: 'Fresh freshwater fish lunch.',
        },
      ],
      impact: {
        timeSavedMin: [40, 70],
        supportsMsmeCount: 1,
      },
      etiquette: [
        {
          id: 'etiq-1',
          text: 'Respect quiet prayer areas.',
          severity: 2,
        },
      ],
      mapsUrl: 'https://maps.google.com/dir/?api=1',
    },
  ],
  regional: [],
  disclaimers: ['Custom responsible travel disclaimer test.'],
  meta: {
    totalMs: 2400,
    models: { agent1: 'gpt-4o' },
    tiersUsed: ['SIMULATION'],
    isReplay: false,
    relaxedStep: 0,
  },
};

describe('ResultDashboard (T-053)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStreamStore.getState().reset();
  });

  it('renders all sections and banners when full result is available', async () => {
    useStreamStore.getState().setResult(mockResult);

    render(
      <AppProviders>
        <ResultDashboard
          analysisId="0192e2b0-res-7000-8000-000000000001"
        />
      </AppProviders>,
    );

    // 1. Simulation Banner
    expect(screen.getByTestId('simulation-banner')).toBeInTheDocument();

    // 2. ThoughtStream
    expect(screen.getByTestId('thought-stream')).toBeInTheDocument();

    // 3. OriginSummary
    expect(screen.getByTestId('origin-summary')).toBeInTheDocument();
    expect(screen.getAllByText('Pura Lempuyang').length).toBeGreaterThanOrEqual(1);

    // 4. VibeBreakdown
    expect(screen.getByTestId('vibe-breakdown')).toBeInTheDocument();

    // 5. DualHistogram
    expect(screen.getByTestId('dual-histogram')).toBeInTheDocument();

    // 6. RouteTabs & RouteCard
    expect(screen.getByTestId('route-tabs-section')).toBeInTheDocument();
    expect(screen.getAllByText('Pura Kehen').length).toBeGreaterThanOrEqual(1);

    // 7. MapView (lazy chunk)
    expect(await screen.findByTestId('map-view-section')).toBeInTheDocument();

    // 8. Disclaimers
    expect(screen.getByTestId('disclaimers-block')).toBeInTheDocument();
  });

  it('triggers action handlers correctly', async () => {
    useStreamStore.getState().setResult(mockResult);

    const onNewAnalysis = vi.fn();
    const onSaveTrip = vi.fn();

    // Mock clipboard writeText
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <AppProviders>
        <ResultDashboard
          analysisId="0192e2b0-res-7000-8000-000000000001"
          onNewAnalysis={onNewAnalysis}
          onSaveTrip={onSaveTrip}
        />
      </AppProviders>,
    );

    // New analysis
    fireEvent.click(screen.getByTestId('new-analysis-button'));
    expect(onNewAnalysis).toHaveBeenCalled();

    // Save trip
    fireEvent.click(screen.getByTestId('save-trip-button'));
    expect(onSaveTrip).toHaveBeenCalled();

    // Copy link
    fireEvent.click(screen.getByTestId('copy-link-button'));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/app/a/0192e2b0-res-7000-8000-000000000001'),
      );
    });
  });

  it('passes vitest-axe accessibility audit without violations', async () => {
    useStreamStore.getState().setResult(mockResult);

    const { container } = render(
      <AppProviders>
        <ResultDashboard
          analysisId="0192e2b0-res-7000-8000-000000000001"
        />
      </AppProviders>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
