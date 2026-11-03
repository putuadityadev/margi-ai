import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import '../../lib/i18n';
import { AppProviders } from '../../app/providers';
import { AnalyzerPage } from './AnalyzerPage';
import { useStreamStore } from '../../stores/streamStore';
import * as apiClientModule from '../../lib/apiClient';

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

const routes = [
  {
    path: '/app',
    element: <AnalyzerPage />,
  },
  {
    path: '/app/a/:analysisId',
    element: <AnalyzerPage />,
  },
];

describe('AnalyzerPage (T-053)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStreamStore.getState().reset();
  });

  it('renders input panel by default when on /app in idle state', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app'] });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /check crowd & find calmer spots/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /upload a destination photo/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows private analysis view when accessing /app/a/:id as a non-owner (403)', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(
      new apiClientModule.ApiClientError(
        'This analysis is private',
        403,
        'FORBIDDEN',
      ),
    );

    const router = createMemoryRouter(routes, {
      initialEntries: ['/app/a/0192e2b0-private-analysis-id'],
    });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('private-analysis-view')).toBeInTheDocument();
      expect(screen.getByText(/This report is private/i)).toBeInTheDocument();
    });

    // Clicking "Start New Analysis" navigates to /app
    const startOwnBtn = screen.getByTestId('start-own-analysis-button');
    fireEvent.click(startOwnBtn);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
    });
  });

  it('restores stored result when accessing /app/a/:id as owner', async () => {
    const mockStoredResult = {
      id: '0192e2b0-stored-1234',
      status: 'COMPLETED' as const,
      locale: 'en' as const,
      simulate: false,
      input: {
        origin: {
          id: 'orig-1',
          slug: 'lempuyang',
          kind: 'DTW' as const,
          category: 'TEMPLE' as const,
          nameEn: 'Pura Lempuyang',
          nameId: 'Pura Lempuyang',
          descriptionEn: 'Temple',
          descriptionId: 'Pura',
          regencyId: 'regency-karangasem',
          lat: -8.39,
          lng: 115.62,
          imageUrl: '/lempuyang.webp',
          isHotspot: true,
          isBufferZone: false,
        },
        arrivalAt: '2026-08-15T09:00:00+08:00',
      },
      vibe: {
        isTravelScene: true,
        sceneSummary: 'Temple gate',
        topography: { label: 'Mountain', descriptors: [], intensity: 0.9 },
        architecture: { label: 'Temple', descriptors: [], intensity: 0.8 },
        lighting: { label: 'Morning', descriptors: [], intensity: 0.7 },
        activity: { label: 'Calm', descriptors: [], intensity: 0.6 },
        visualDensity: { label: 'Open', descriptors: [], intensity: 0.5 },
        detectedLandmarkGuess: 'Pura Lempuyang',
        confidence: 0.9,
      },
      origin: {
        venue: {
          id: 'orig-1',
          slug: 'lempuyang',
          kind: 'DTW' as const,
          category: 'TEMPLE' as const,
          nameEn: 'Pura Lempuyang',
          nameId: 'Pura Lempuyang',
          descriptionEn: 'Temple',
          descriptionId: 'Pura',
          regencyId: 'regency-karangasem',
          lat: -8.39,
          lng: 115.62,
          imageUrl: '/lempuyang.webp',
          isHotspot: true,
          isBufferZone: false,
        },
        snapshot: {
          busynessNow: 90,
          forecastNow: 90,
          forecastPlus2: 95,
          bEff: 90,
          tier: 'LIVE' as const,
          synthetic: false,
          hourlyCurve: Array(24).fill(90) as number[],
          arrivalHours: [9],
          departureHours: [10],
          isOpen: true,
        },
        cfs: 92,
        redZone: true,
        queueEstimateMin: 180,
      },
      insight: 'Severe queue bottleneck at origin.',
      micro: [],
      regional: [],
      disclaimers: [],
      meta: {
        totalMs: 2000,
        models: {},
        tiersUsed: ['LIVE' as const],
        isReplay: false,
        relaxedStep: 0,
      },
    };

    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce(mockStoredResult);

    const router = createMemoryRouter(routes, {
      initialEntries: ['/app/a/0192e2b0-stored-1234'],
    });

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('result-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('origin-summary')).toBeInTheDocument();
    });
  });
});
