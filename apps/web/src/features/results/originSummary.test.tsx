import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '../../lib/i18n';
import { useStreamStore } from '../../stores/streamStore';
import { OriginSummary } from './OriginSummary';
import { SimulationBanner, ReplayBanner, RelaxedMatchBanner } from './Banners';
import { Disclaimers } from './Disclaimers';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { buildAnalysisResult, type BuildResultOptions } from '../../mocks/pipeline/buildResult';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithI18n(ui: ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </QueryClientProvider>,
  );
}

const defaultInput: BuildResultOptions['input'] = {
  originVenueId: 'dtw-lempuyang',
  arrivalAt: '2026-06-20T13:00:00+08:00',
  locale: 'en',
};

describe('OriginSummary, Banners, and BusynessBadge (T-048)', () => {
  beforeEach(() => {
    useStreamStore.getState().reset();
  });

  describe('BusynessBadge component', () => {
    it('renders Live surge busyness (> 100%)', () => {
      render(<BusynessBadge bEff={115} tier="LIVE" />);
      const badge = screen.getByTestId('busyness-badge');
      expect(badge).toHaveTextContent('115%');
      expect(badge).toHaveTextContent(/surge/i);
      expect(badge).toHaveTextContent(/live/i);
    });

    it('renders Simulated tier badge', () => {
      render(<BusynessBadge bEff={35} tier="SIMULATION" synthetic={false} />);
      const badge = screen.getByTestId('busyness-badge');
      expect(badge).toHaveTextContent('35%');
      expect(badge).toHaveTextContent(/simulated/i);
    });

    it('renders Simulated (baseline) when synthetic', () => {
      render(<BusynessBadge bEff={50} tier="SIMULATION" synthetic={true} />);
      const badge = screen.getByTestId('busyness-badge');
      expect(badge).toHaveTextContent(/simulated \(baseline\)/i);
    });
  });

  describe('Banners & Disclaimers', () => {
    it('renders simulation banner with AC-06.3 copy', () => {
      renderWithI18n(<SimulationBanner surgePct={115} />);
      expect(screen.getByTestId('simulation-banner')).toBeInTheDocument();
      expect(screen.getByText(/Simulated data — not live conditions/i)).toBeInTheDocument();
    });

    it('renders replay banner', () => {
      renderWithI18n(<ReplayBanner />);
      expect(screen.getByTestId('replay-banner')).toBeInTheDocument();
      expect(screen.getByText(/Replayed result — AI provider unavailable/i)).toBeInTheDocument();
    });

    it('renders relaxed match banner', () => {
      renderWithI18n(<RelaxedMatchBanner step={1} reasons={['Expanded calm threshold to 45%']} />);
      expect(screen.getByTestId('relaxed-banner')).toBeInTheDocument();
      expect(screen.getByText(/Relaxed Match Criteria Applied/i)).toBeInTheDocument();
      expect(screen.getByText(/Expanded calm threshold to 45%/i)).toBeInTheDocument();
    });

    it('renders disclaimers in English and Indonesian', async () => {
      await i18n.changeLanguage('en');
      const { rerender } = renderWithI18n(<Disclaimers />);
      expect(screen.getByText(/Crowd telemetry reflects historical patterns/i)).toBeInTheDocument();

      await i18n.changeLanguage('id');
      rerender(
        <I18nextProvider i18n={i18n}>
          <Disclaimers />
        </I18nextProvider>,
      );
      expect(
        screen.getByText(/Telemetri kepadatan bersumber dari pola historis/i),
      ).toBeInTheDocument();
      await i18n.changeLanguage('en');
    });
  });

  describe('OriginSummary component', () => {
    it('renders skeleton when origin data is absent', () => {
      renderWithI18n(<OriginSummary origin={null} />);
      expect(screen.getByTestId('origin-summary-skeleton')).toBeInTheDocument();
    });

    it('renders red zone hotspot summary correctly', () => {
      const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });

      renderWithI18n(
        <OriginSummary
          origin={result.origin}
          insight={result.insight}
          arrivalAt={result.input.arrivalAt}
          simulate={result.simulate}
        />,
      );

      expect(screen.getByTestId('origin-summary')).toBeInTheDocument();
      expect(screen.getByText(result.origin.venue.nameEn)).toBeInTheDocument();
      expect(screen.getByTestId('red-zone-pill')).toBeInTheDocument();
      expect(screen.getByTestId('cfs-value')).toHaveTextContent(
        String(Math.round(result.origin.cfs)),
      );
    });

    it('with simulate=true badge reflects simulated conditions and banner is active', () => {
      const result = buildAnalysisResult({
        input: { ...defaultInput, simulate: true },
        scenario: 'simulate',
      });

      renderWithI18n(
        <div>
          <SimulationBanner surgePct={115} />
          <OriginSummary
            origin={result.origin}
            insight={result.insight}
            arrivalAt={result.input.arrivalAt}
            simulate={true}
          />
        </div>,
      );

      expect(screen.getByTestId('simulation-banner')).toBeInTheDocument();
      expect(screen.getByTestId('busyness-badge')).toHaveTextContent(/SIMULATED/i);
    });

    it('has zero axe accessibility violations', async () => {
      const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });

      const { container } = renderWithI18n(
        <div>
          <SimulationBanner surgePct={115} />
          <OriginSummary
            origin={result.origin}
            insight={result.insight}
            arrivalAt={result.input.arrivalAt}
          />
          <Disclaimers />
        </div>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
