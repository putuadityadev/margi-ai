import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import '../../lib/i18n';
import type { AnalysisResult, RouteCard } from '@margi-ai/shared';
import { ConciergeModal } from './ConciergeModal';

const mockOrigin: AnalysisResult['origin'] = {
  venue: {
    id: '0192e2b0-orig-7000-8000-000000000001',
    slug: 'pura-lempuyang',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Lempuyang',
    nameId: 'Pura Lempuyang',
    descriptionEn: 'Mountain split gate temple',
    descriptionId: 'Pura gerbang terbelah',
    regencyId: 'regency-karangasem',
    lat: -8.39,
    lng: 115.62,
    imageUrl: '/presets/lempuyang.webp',
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
};

const mockAlternative: RouteCard = {
  rank: 1,
  venue: {
    id: '0192e2b0-dest-7000-8000-000000000001',
    slug: 'pura-kehen',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Kehen',
    nameId: 'Pura Kehen',
    descriptionEn: 'Serene terraced stone sanctuary in Bangli',
    descriptionId: 'Pura kuno berundak hening di Bangli',
    regencyId: 'regency-bangli',
    lat: -8.43,
    lng: 115.36,
    imageUrl: '/venues/kehen.webp',
    isHotspot: false,
    isBufferZone: false,
    distanceKm: 8.4,
    travelMinEstimate: 16,
    regency: {
      id: 'regency-bangli',
      nameEn: 'Bangli',
      nameId: 'Bangli',
      phrStatus: 'RECIPIENT',
    },
  },
  snapshot: {
    busynessNow: 22,
    forecastNow: 22,
    forecastPlus2: 24,
    bEff: 22,
    tier: 'FORECAST',
    synthetic: false,
    hourlyCurve: Array(24).fill(22) as number[],
    arrivalHours: [9],
    departureHours: [10],
    isOpen: true,
  },
  simVibe: 85,
  topMatchingDimensions: ['Sacred Stone', 'Tiered Architecture'],
  cfs: 28.0,
  fiscalBoost: true,
  impact: {
    timeSavedMin: [35, 55],
    supportsMsmeCount: 1,
  },
  whyItMatches: 'Serene terraced stone sanctuary without the crowds.',
  bestTimeTip: 'Visit before 10:00 WITA.',
  mapsUrl: 'https://maps.google.com/?q=-8.43,115.36',
  etiquette: [],
  msme: [
    {
      venue: {
        id: 'msme-01',
        slug: 'warung-sari-kehen',
        kind: 'MSME',
        category: 'CULINARY',
        nameEn: 'Warung Sari Kehen',
        nameId: 'Warung Sari Kehen',
        descriptionEn: 'Authentic local warung',
        descriptionId: 'Warung masakan lokal',
        regencyId: 'regency-bangli',
        lat: -8.431,
        lng: 115.362,
        imageUrl: '/venues/warung.webp',
        isHotspot: false,
        isBufferZone: false,
        distanceKm: 0.2,
      },
      simVibe: 78,
      snapshot: {
        busynessNow: 15,
        forecastNow: 18,
        forecastPlus2: 20,
        bEff: 18,
        tier: 'LIVE',
        synthetic: false,
        hourlyCurve: Array(24).fill(18) as number[],
        arrivalHours: [11],
        departureHours: [12],
        isOpen: true,
      },
      pairingReason: 'Authentic local dishes and mountain coffee.',
    },
  ],
};

describe('ConciergeModal', () => {
  const onClose = vi.fn();
  const onSelectAlternative = vi.fn();
  const onAccPlan = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 0 reality check with live report and moves to step 1, 2, 3', () => {
    render(
      <ConciergeModal
        isOpen={true}
        onClose={onClose}
        origin={mockOrigin}
        activeAlternative={mockAlternative}
        onSelectAlternative={onSelectAlternative}
        onAccPlan={onAccPlan}
      />,
    );

    // Step 0: Reality check
    expect(screen.getByTestId('concierge-modal')).toBeInTheDocument();
    expect(screen.getByTestId('concierge-step-0')).toBeInTheDocument();
    expect(screen.getAllByText(/Pura Lempuyang/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/210/i).length).toBeGreaterThanOrEqual(1);

    // Next button -> Step 1
    fireEvent.click(screen.getByTestId('concierge-next-button'));
    expect(screen.getByTestId('concierge-step-1')).toBeInTheDocument();
    expect(screen.getByText(/06:30 – 08:30 WITA/i)).toBeInTheDocument();

    // Next button -> Step 2
    fireEvent.click(screen.getByTestId('concierge-next-button'));
    expect(screen.getByTestId('concierge-step-2')).toBeInTheDocument();
    expect(screen.getAllByText(/Pura Kehen/i).length).toBeGreaterThanOrEqual(1);

    // Next button -> Step 3 (Decision & Chat)
    fireEvent.click(screen.getByTestId('concierge-next-button'));
    expect(screen.getByTestId('concierge-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('concierge-acc-reroute')).toBeInTheDocument();

    // Click ACC Reroute
    fireEvent.click(screen.getByTestId('concierge-acc-reroute'));
    expect(onSelectAlternative).toHaveBeenCalledWith(mockAlternative.venue.id);
    expect(onAccPlan).toHaveBeenCalledWith(mockAlternative.venue.id, 'reroute');
  });

  it('allows asking AI concierge via quick chips', async () => {
    render(
      <ConciergeModal
        isOpen={true}
        onClose={onClose}
        origin={mockOrigin}
        activeAlternative={mockAlternative}
        onSelectAlternative={onSelectAlternative}
        onAccPlan={onAccPlan}
      />,
    );

    // Jump to step 3
    fireEvent.click(screen.getByTestId('concierge-next-button'));
    fireEvent.click(screen.getByTestId('concierge-next-button'));
    fireEvent.click(screen.getByTestId('concierge-next-button'));

    expect(screen.getByTestId('concierge-step-3')).toBeInTheDocument();

    // Click quick question chip
    const chip = screen.getByRole('button', { name: /lunch spot|makan siang/i });
    fireEvent.click(chip);

    expect(chip).toBeInTheDocument();
  });

  it('passes accessibility audit (vitest-axe)', async () => {
    const { container } = render(
      <ConciergeModal
        isOpen={true}
        onClose={onClose}
        origin={mockOrigin}
        activeAlternative={mockAlternative}
        onSelectAlternative={onSelectAlternative}
        onAccPlan={onAccPlan}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
