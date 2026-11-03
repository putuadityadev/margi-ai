import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../lib/i18n';
import { useStreamStore } from '../../stores/streamStore';
import { VibeBreakdown } from './VibeBreakdown';
import { buildAnalysisResult, type BuildResultOptions } from '../../mocks/pipeline/buildResult';

function renderWithI18n(ui: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const defaultInput: BuildResultOptions['input'] = {
  originVenueId: 'dtw-lempuyang',
  arrivalAt: '2026-06-20T13:00:00+08:00',
  locale: 'en',
};

describe('VibeBreakdown (T-049)', () => {
  beforeEach(() => {
    useStreamStore.getState().reset();
  });

  it('renders skeleton state when vibe profile is absent', () => {
    renderWithI18n(<VibeBreakdown vibe={null} />);
    const skeleton = screen.getByTestId('vibe-breakdown-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('min-h-[420px]');
  });

  it('renders vibe profile with 5 accessible dimension meters', () => {
    const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });

    renderWithI18n(
      <VibeBreakdown vibe={result.vibe} referenceImageUrl="/images/presets/lempuyang.webp" />,
    );

    expect(screen.getByTestId('vibe-breakdown')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(result.vibe.sceneSummary, 'i'))).toBeInTheDocument();

    // Check that 5 meters are rendered and expose aria-valuenow
    const meters = screen.getAllByRole('meter');
    expect(meters).toHaveLength(5);

    meters.forEach((meter) => {
      expect(meter).toHaveAttribute('aria-valuenow');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    });

    // Check confidence text
    expect(screen.getByText(/Match/i)).toBeInTheDocument();
    expect(screen.getByText(`${Math.round(result.vibe.confidence * 100)}%`)).toBeInTheDocument();
  });

  it('has zero axe accessibility violations', async () => {
    const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });

    const { container } = renderWithI18n(
      <VibeBreakdown vibe={result.vibe} referenceImageUrl="/images/presets/lempuyang.webp" />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
