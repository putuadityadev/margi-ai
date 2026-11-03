import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import '../../lib/i18n';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';
import { MapView } from './MapView';

// Mock react-leaflet to prevent JSDOM container size errors
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

const mockOrigin = {
  id: 'orig-1',
  name: 'Pura Lempuyang',
  lat: -8.39,
  lng: 115.62,
};

const mockAlt: RouteCardType = {
  venue: {
    id: 'alt-1',
    slug: 'kehen',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Kehen',
    nameId: 'Pura Kehen',
    descriptionEn: 'Historic temple',
    descriptionId: 'Pura bersejarah',
    regencyId: 'regency-bangli',
    lat: -8.435,
    lng: 115.356,
    imageUrl: '/kehen.webp',
    isHotspot: false,
    isBufferZone: false,
    regency: {
      id: 'regency-bangli',
      nameEn: 'Bangli',
      nameId: 'Bangli',
      phrStatus: 'RECIPIENT',
    },
    distanceKm: 15,
    travelMinEstimate: 25,
  },
  simVibe: 85,
  topMatchingDimensions: ['Sacred'],
  cfs: 30,
  rank: 80,
  fiscalBoost: true,
  snapshot: {
    busynessNow: 20,
    forecastNow: 20,
    forecastPlus2: 25,
    bEff: 20,
    tier: 'FORECAST',
    synthetic: false,
    hourlyCurve: Array(24).fill(20) as number[],
    arrivalHours: [9],
    departureHours: [10],
    isOpen: true,
  },
  whyItMatches: 'Quiet atmosphere',
  bestTimeTip: 'Early morning',
  msme: [
    {
      venue: {
        id: 'msme-1',
        slug: 'warung-1',
        kind: 'MSME',
        category: 'CULINARY',
        nameEn: 'Warung Sari',
        nameId: 'Warung Sari',
        descriptionEn: 'Local culinary',
        descriptionId: 'Kuliner lokal',
        regencyId: 'regency-bangli',
        lat: -8.436,
        lng: 115.357,
        imageUrl: '/warung.webp',
        isHotspot: false,
        isBufferZone: false,
        distanceKm: 0.2,
      },
      simVibe: 80,
      snapshot: {
        busynessNow: 10,
        forecastNow: 15,
        forecastPlus2: 15,
        bEff: 15,
        tier: 'LIVE',
        synthetic: false,
        hourlyCurve: Array(24).fill(15) as number[],
        arrivalHours: [11],
        departureHours: [12],
        isOpen: true,
      },
      pairingReason: 'Traditional Balinese lunch',
    },
  ],
  impact: {
    timeSavedMin: [30, 50],
    supportsMsmeCount: 1,
  },
  etiquette: [],
  mapsUrl: 'https://maps.google.com',
};

describe('MapView (T-052)', () => {
  it('renders spatial section, legend, and aria-hidden map container', () => {
    render(
      <MapView
        origin={mockOrigin}
        alternatives={[mockAlt]}
        activeCardId="alt-1"
      />,
    );

    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(
      screen.getByText(/Explore the original spot, calmer alternatives, and nearby local businesses/i),
    ).toBeInTheDocument();

    // Legend
    expect(screen.getByText('Original busy spot')).toBeInTheDocument();
    expect(screen.getByText('Calmer similar place')).toBeInTheDocument();
    expect(screen.getByText('Nearby local MSME')).toBeInTheDocument();

    // Map container exists with aria-hidden
    const mapWrapper = screen.getByTestId('leaflet-map-wrapper');
    expect(mapWrapper).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('mock-map-container')).toBeInTheDocument();
  });

  it('allows mobile collapsing of the map container', () => {
    render(
      <MapView
        origin={mockOrigin}
        alternatives={[mockAlt]}
      />,
    );

    const toggleButton = screen.getByTestId('toggle-map-button');
    expect(screen.getByTestId('leaflet-map-wrapper')).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByTestId('leaflet-map-wrapper')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(toggleButton);
    expect(screen.getByTestId('leaflet-map-wrapper')).toBeInTheDocument();
  });

  it('has zero accessibility violations (axe)', async () => {
    const { container } = render(
      <MapView
        origin={mockOrigin}
        alternatives={[mockAlt]}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
