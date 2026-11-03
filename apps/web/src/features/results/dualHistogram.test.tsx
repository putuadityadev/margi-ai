import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../lib/i18n';
import { useStreamStore } from '../../stores/streamStore';
import { DualHistogram } from './DualHistogram';
import { buildAnalysisResult, type BuildResultOptions } from '../../mocks/pipeline/buildResult';

function renderWithI18n(ui: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const defaultInput: BuildResultOptions['input'] = {
  originVenueId: 'dtw-lempuyang',
  arrivalAt: '2026-06-20T13:00:00+08:00',
  locale: 'en',
};

describe('DualHistogram (T-050)', () => {
  beforeEach(() => {
    useStreamStore.getState().reset();
  });

  it('renders skeleton when origin data is absent', () => {
    renderWithI18n(<DualHistogram origin={null} />);
    expect(screen.getByTestId('dual-histogram-skeleton')).toBeInTheDocument();
  });

  it('renders dual histogram with origin and active alternative card data', () => {
    const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });
    const altCard = result.micro[0];

    renderWithI18n(<DualHistogram origin={result.origin} activeCard={altCard} arrivalHour={13} />);

    expect(screen.getByTestId('dual-histogram')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-chart-container')).toBeInTheDocument();
    expect(screen.getByText(/Busy Hours Today/i)).toBeInTheDocument();

    // Check legend items
    expect(screen.getByText(result.origin.venue.nameEn)).toBeInTheDocument();
    if (altCard) {
      expect(screen.getByText(altCard.venue.nameEn)).toBeInTheDocument();
    }
  });

  it('provides screen reader summary with arrival hour and crowd comparison', () => {
    const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });
    const altCard = result.micro[0];

    const { container } = renderWithI18n(
      <DualHistogram origin={result.origin} activeCard={altCard} arrivalHour={13} />,
    );

    const srText = container.querySelector('.sr-only');
    expect(srText).toBeInTheDocument();
    expect(srText?.textContent).toContain('06:00 to 22:00 WITA');
    expect(srText?.textContent).toContain('13:00 WITA');
    expect(srText?.textContent).toContain(result.origin.venue.nameEn);
  });

  it('has zero axe accessibility violations', async () => {
    const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });
    const altCard = result.micro[0];

    const { container } = renderWithI18n(
      <DualHistogram origin={result.origin} activeCard={altCard} arrivalHour={13} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
