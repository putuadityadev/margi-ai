import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import '../../lib/i18n';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';
import { rankScore } from '@margi-ai/shared';
import { RouteCard } from './RouteCard';
import { RouteTabs } from './RouteTabs';
import { ScoreExplainer } from './ScoreExplainer';
import { Etiquette } from './Etiquette';
import { MsmeBundleItem } from './MsmeBundleItem';
import { track } from '../../lib/track';

vi.mock('../../lib/track', () => ({
  track: vi.fn(),
}));

const mockHourlyCurve = Array(24).fill(25) as number[];

const mockCardTemple: RouteCardType = {
  venue: {
    id: '0192e2b0-dest-7000-8000-000000000001',
    slug: 'pura-kehen',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Kehen',
    nameId: 'Pura Kehen',
    descriptionEn: 'Historic terraced sanctuary in Bangli.',
    descriptionId: 'Pura kuno bertingkat di Bangli.',
    regencyId: 'regency-bangli',
    lat: -8.435,
    lng: 115.356,
    imageUrl: '/venues/kehen.webp',
    imageCredit: 'MARGI Test',
    isHotspot: false,
    isBufferZone: false,
    regency: {
      id: 'regency-bangli',
      nameEn: 'Bangli',
      nameId: 'Bangli',
      phrStatus: 'RECIPIENT',
    },
    distanceKm: 8.4,
    travelMinEstimate: 18,
  },
  simVibe: 84.5,
  topMatchingDimensions: ['Sacred Stone', 'Tiered Architecture'],
  cfs: 28.0,
  rank: 82.5, // 0.50*84.5 + 0.35*(100-28) + 0.15*100 = 42.25 + 25.2 + 15 = 82.45 ≈ 82.5
  fiscalBoost: true,
  snapshot: {
    busynessNow: 22,
    forecastNow: 25,
    forecastPlus2: 28,
    bEff: 25,
    tier: 'FORECAST',
    synthetic: false,
    hourlyCurve: mockHourlyCurve,
    arrivalHours: [9],
    departureHours: [10],
    isOpen: true,
  },
  whyItMatches: 'Serene terraced stone sanctuary offering identical atmospheric peace without bus lines.',
  bestTimeTip: 'Visit before 10:00 WITA for gentle courtyard mist.',
  msme: [
    {
      venue: {
        id: '0192e2b0-msme-7000-8000-000000000011',
        slug: 'warung-kehen',
        kind: 'MSME',
        category: 'CULINARY',
        nameEn: 'Warung Kehen Sari',
        nameId: 'Warung Kehen Sari',
        descriptionEn: 'Traditional Mujair Nyat-nyat',
        descriptionId: 'Olahan mujair nyat-nyat khas Bangli',
        regencyId: 'regency-bangli',
        lat: -8.436,
        lng: 115.357,
        imageUrl: '/venues/warung-gurame.webp',
        isHotspot: false,
        isBufferZone: false,
        distanceKm: 0.3,
      },
      simVibe: 78,
      snapshot: {
        busynessNow: 15,
        forecastNow: 18,
        forecastPlus2: 20,
        bEff: 18,
        tier: 'LIVE',
        synthetic: false,
        hourlyCurve: mockHourlyCurve,
        arrivalHours: [11],
        departureHours: [12],
        isOpen: true,
      },
      pairingReason: 'Fresh lake fish prepared with local heritage spices.',
    },
  ],
  impact: {
    timeSavedMin: [35, 55],
    supportsMsmeCount: 1,
  },
  etiquette: [
    {
      id: 'etiq-calm',
      text: 'Maintain quiet voices near inner sanctum shrines.',
      severity: 2,
    },
  ],
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-8.435,115.356',
};

const mockCardNature: RouteCardType = {
  ...mockCardTemple,
  venue: {
    ...mockCardTemple.venue,
    id: '0192e2b0-dest-7000-8000-000000000002',
    slug: 'sambangan-secret-garden',
    nameEn: 'Sambangan Secret Garden',
    category: 'WATERFALL',
    regency: {
      id: 'regency-buleleng',
      nameEn: 'Buleleng',
      nameId: 'Buleleng',
      phrStatus: 'RECIPIENT',
    },
  },
  etiquette: [
    {
      id: 'etiq-waste',
      text: 'Take all plastics and waste back out of the ravine.',
      severity: 3,
    },
  ],
};

describe('T-051 · Route components and RouteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ScoreExplainer client deterministic recomputation (TDD §3)', () => {
    it('verifies client computed rank matches server rank within 0.1 tolerance', () => {
      const simVibe = 84.5;
      const cfs = 28.0;
      const fiscalBoost = true;
      const serverRank = 82.5;

      const clientComputed = rankScore(simVibe, cfs, fiscalBoost ? 100 : 0);
      expect(Math.abs(clientComputed - serverRank)).toBeLessThanOrEqual(0.1);

      render(
        <ScoreExplainer
          simVibe={simVibe}
          cfs={cfs}
          fiscalBoost={fiscalBoost}
          serverRank={serverRank}
        />,
      );

      expect(screen.getByText(/How is this calculated\?/i)).toBeInTheDocument();
      expect(screen.getByTestId('client-computed-rank')).toHaveTextContent('82.5 / 100');
      expect(screen.getByText(/100% Deterministic match/i)).toBeInTheDocument();
    });
  });

  describe('Etiquette component cultural enforcement (AC-05.4)', () => {
    it('always injects the temple sarong mandate for TEMPLE category if not present', () => {
      render(<Etiquette items={mockCardTemple.etiquette} category="TEMPLE" />);

      expect(
        screen.getByText(/Must wear a sarong and sash/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/\[Mandatory\]/i)).toBeInTheDocument();
    });

    it('does not inject sarong mandate for non-temple categories', () => {
      render(<Etiquette items={mockCardNature.etiquette} category="WATERFALL" />);

      expect(
        screen.queryByText(/Must wear a sarong and sash/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/Take all plastics and waste back out/i),
      ).toBeInTheDocument();
    });

    it('limits displayed etiquette rules to at most 3', () => {
      const fourRules = [
        { id: '1', text: 'Rule 1', severity: 1 },
        { id: '2', text: 'Rule 2', severity: 1 },
        { id: '3', text: 'Rule 3', severity: 1 },
        { id: '4', text: 'Rule 4', severity: 1 },
      ];
      render(<Etiquette items={fourRules} category="NATURE" />);

      expect(screen.getByText('Rule 1')).toBeInTheDocument();
      expect(screen.getByText('Rule 2')).toBeInTheDocument();
      expect(screen.getByText('Rule 3')).toBeInTheDocument();
      expect(screen.queryByText('Rule 4')).not.toBeInTheDocument();
    });
  });

  describe('MsmeBundleItem', () => {
    it('renders MSME details and tracks navigate clicks', () => {
      const msme = mockCardTemple.msme[0]!;
      render(<MsmeBundleItem item={msme} />);

      expect(screen.getByText('Warung Kehen Sari')).toBeInTheDocument();
      expect(screen.getByText('CULINARY')).toBeInTheDocument();
      expect(screen.getByText('+0.3 km')).toBeInTheDocument();
      expect(screen.getByText(/Fresh lake fish prepared/i)).toBeInTheDocument();

      const navLink = screen.getByTestId('msme-navigate-link');
      expect(navLink).toHaveAttribute('target', '_blank');
      expect(navLink).toHaveAttribute('rel', 'noopener noreferrer');

      fireEvent.click(navLink);
      expect(track).toHaveBeenCalledWith('navigate_clicked', {
        venueId: msme.venue.id,
        kind: 'MSME',
      });
    });
  });

  describe('RouteCard', () => {
    it('renders all required metrics, badges, and triggers telemetry', () => {
      const onSelect = vi.fn();
      render(<RouteCard card={mockCardTemple} isActive={false} onSelect={onSelect} />);

      // Venue header info
      expect(screen.getByText('Pura Kehen')).toBeInTheDocument();
      expect(screen.getByText('Bangli')).toBeInTheDocument();
      expect(screen.getByText(/~8.4 km/i)).toBeInTheDocument();
      expect(screen.getAllByText('85%').length).toBeGreaterThanOrEqual(1);

      // Top matches
      expect(screen.getByText('Sacred Stone')).toBeInTheDocument();

      // Impact badges
      expect(screen.getByTestId('badge-time-saved')).toHaveTextContent(/~35–55 min/i);
      expect(screen.getByTestId('badge-fiscal-boost')).toBeInTheDocument();
      expect(screen.getByTestId('badge-msme-support')).toHaveTextContent(/1 local MSME/i);

      // Best time tip & Why it matches
      expect(screen.getByText(/Serene terraced stone sanctuary/i)).toBeInTheDocument();
      expect(screen.getByText(/Visit before 10:00 WITA/i)).toBeInTheDocument();

      // MSME bundle present
      expect(screen.getByText('Recommended Local MSMEs')).toBeInTheDocument();
      expect(screen.getByText('Warung Kehen Sari')).toBeInTheDocument();

      // View telemetry tracked once on mount
      expect(track).toHaveBeenCalledWith('recommendation_viewed', {
        venueId: mockCardTemple.venue.id,
        rank: mockCardTemple.rank,
        fiscalBoost: true,
      });

      // Card selection via click
      const cardArticle = screen.getByTestId(`route-card-${mockCardTemple.venue.id}`);
      fireEvent.click(cardArticle);
      expect(onSelect).toHaveBeenCalledWith(mockCardTemple.venue.id);

      // Card selection via keyboard (Enter)
      fireEvent.keyDown(cardArticle, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(2);

      // Navigate link
      const navLink = screen.getByTestId('dtw-navigate-link');
      expect(navLink).toHaveAttribute('href', mockCardTemple.mapsUrl);
      expect(navLink).toHaveAttribute('target', '_blank');
      expect(navLink).toHaveAttribute('rel', 'noopener noreferrer');

      fireEvent.click(navLink);
      expect(track).toHaveBeenCalledWith('navigate_clicked', {
        venueId: mockCardTemple.venue.id,
        kind: 'DTW',
      });
    });

    it('passes vitest-axe accessibility audit without violations', async () => {
      const { container } = render(<RouteCard card={mockCardTemple} isActive={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('RouteTabs', () => {
    it('toggles between micro and regional tabs and enforces max 3 cards', () => {
      const fourMicroCards: RouteCardType[] = [
        mockCardTemple,
        { ...mockCardTemple, venue: { ...mockCardTemple.venue, id: 'id-2', nameEn: 'Card 2' } },
        { ...mockCardTemple, venue: { ...mockCardTemple.venue, id: 'id-3', nameEn: 'Card 3' } },
        { ...mockCardTemple, venue: { ...mockCardTemple.venue, id: 'id-4', nameEn: 'Card 4' } },
      ];
      const regionalCards: RouteCardType[] = [mockCardNature];

      const onSelect = vi.fn();
      render(
        <RouteTabs
          microCards={fourMicroCards}
          regionalCards={regionalCards}
          activeCardId="0192e2b0-dest-7000-8000-000000000001"
          onSelectCard={onSelect}
        />,
      );

      // Micro tab active by default
      expect(screen.getByTestId('tab-button-micro')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Pura Kehen')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
      expect(screen.getByText('Card 3')).toBeInTheDocument();
      // 4th card should not be displayed (max 3)
      expect(screen.queryByText('Card 4')).not.toBeInTheDocument();

      // Switch to regional tab
      fireEvent.click(screen.getByTestId('tab-button-regional'));
      expect(screen.getByTestId('tab-button-regional')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Sambangan Secret Garden')).toBeInTheDocument();
    });

    it('passes vitest-axe accessibility audit on tabs', async () => {
      const { container } = render(
        <RouteTabs
          microCards={[mockCardTemple]}
          regionalCards={[mockCardNature]}
          activeCardId="0192e2b0-dest-7000-8000-000000000001"
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
