import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../lib/i18n';
import { useStreamStore } from '../../stores/streamStore';
import { ThoughtStream } from './ThoughtStream';
import { StepRow } from './StepRow';
import { buildAnalysisResult, type BuildResultOptions } from '../../mocks/pipeline/buildResult';
import { buildTranscript } from '../../mocks/pipeline/buildTranscript';

function renderWithI18n(ui: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const defaultInput: BuildResultOptions['input'] = {
  originVenueId: 'dtw-lempuyang',
  arrivalAt: '2026-06-20T13:00:00+08:00',
  locale: 'en',
};

describe('ThoughtStream & ScanningIllustration (T-047)', () => {
  beforeEach(async () => {
    useStreamStore.getState().reset();
    await i18n.changeLanguage('en');
  });

  describe('StepRow component', () => {
    it('renders running step with pulsing indicator', () => {
      render(
        <StepRow
          event={{
            type: 'step',
            agent: 'vibe',
            stepId: 'vibe-analyze',
            status: 'running',
            title: 'Deconstructing visual features...',
            ts: Date.now(),
          }}
        />,
      );

      expect(screen.getByTestId('step-row')).toBeInTheDocument();
      expect(screen.getByText('Deconstructing visual features...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders completed step with duration and payload details', () => {
      render(
        <StepRow
          event={{
            type: 'step',
            agent: 'crowd',
            stepId: 'telemetry-eval',
            status: 'done',
            title: 'Telemetry queries complete',
            ms: 450,
            detail: 'Origin CFS evaluated at 86',
            data: { originCfs: 86, isRedZone: true },
            ts: Date.now(),
          }}
        />,
      );

      expect(screen.getByText('Telemetry queries complete')).toBeInTheDocument();
      expect(screen.getByText('Origin CFS evaluated at 86')).toBeInTheDocument();
      expect(screen.getByText('450ms')).toBeInTheDocument();
      expect(screen.getByText('Payload & Details')).toBeInTheDocument();
    });

    it('renders fallback step with amber indicator', () => {
      render(
        <StepRow
          event={{
            type: 'step',
            agent: 'vibe',
            stepId: 'vibe-eval',
            status: 'fallback',
            title: 'Cached vibe profile (LKG replay)',
            detail: 'Replayed result — AI provider unavailable',
            ms: 820,
            ts: Date.now(),
          }}
        />,
      );

      const row = screen.getByTestId('step-row');
      expect(row).toHaveAttribute('data-status', 'fallback');
      expect(screen.getByText('Cached vibe profile (LKG replay)')).toBeInTheDocument();
      expect(screen.getByText('Replayed result — AI provider unavailable')).toBeInTheDocument();
    });

    it('renders tool_call with tier badge and argument disclosure', () => {
      render(
        <StepRow
          event={{
            type: 'tool_call',
            agent: 'crowd',
            tool: 'fetch_live_busyness',
            tier: 'LIVE',
            resultSummary: 'Origin live busyness is 86% (Surge)',
            ms: 180,
            args: { venueId: 'dtw-lempuyang', hour: 13 },
            ts: Date.now(),
          }}
        />,
      );

      expect(screen.getByTestId('tool-call-row')).toBeInTheDocument();
      expect(screen.getByText('fetch_live_busyness')).toBeInTheDocument();
      expect(screen.getByTestId('tier-badge')).toHaveTextContent('Live');
      expect(screen.getByText('Origin live busyness is 86% (Surge)')).toBeInTheDocument();
      expect(screen.getByText('180ms')).toBeInTheDocument();
      expect(screen.getByText('Tool Arguments')).toBeInTheDocument();
    });

    it('renders error row with code and alert role', () => {
      render(
        <StepRow
          event={{
            type: 'error',
            code: 'AI_VISION_BUSY',
            message: 'AI vision is busy, please try again.',
            recoverable: true,
          }}
        />,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/AI_VISION_BUSY/)).toBeInTheDocument();
    });
  });

  describe('ThoughtStream scanning illustration & human progress states', () => {
    it('renders animated person scanning illustration and 3 human steps while streaming', () => {
      const store = useStreamStore.getState();
      store.setStreaming('analysis-live-1');
      store.addEvent('1', {
        type: 'step',
        agent: 'vibe',
        stepId: 'vibe-done',
        status: 'done',
        title: 'Scene identified',
        ts: Date.now(),
      });

      renderWithI18n(<ThoughtStream />);

      expect(screen.getByTestId('scanning-illustration')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '48');
      expect(screen.getByTestId('scan-step-photo')).toHaveAttribute('data-state', 'done');
      expect(screen.getByTestId('scan-step-traffic')).toHaveAttribute('data-state', 'active');
      expect(screen.getByTestId('scan-step-places')).toHaveAttribute('data-state', 'pending');

      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-live', 'polite');
      expect(log).toHaveAttribute('aria-atomic', 'false');
    });

    it('renders quiet single-line confirmation once completed', () => {
      const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });
      const transcript = buildTranscript({ result, scenario: 'default' });

      const store = useStreamStore.getState();
      store.setStreaming(result.id);
      for (const item of transcript) {
        store.addEvent(item.id, item.event);
      }
      store.setStatus('completed');

      renderWithI18n(<ThoughtStream />);

      expect(screen.getByTestId('thought-stream')).toBeInTheDocument();
      expect(
        screen.getByText(/Photo checked — here is the crowd report and calmer places nearby/i),
      ).toBeInTheDocument();
    });

    it('renders friendly error alert when scan fails', () => {
      const result = buildAnalysisResult({ input: defaultInput, scenario: 'default' });
      const transcript = buildTranscript({ result, scenario: 'vision-busy' });

      const store = useStreamStore.getState();
      store.setStreaming(result.id);
      for (const item of transcript) {
        store.addEvent(item.id, item.event);
        if (item.event.type === 'error') {
          store.setError(item.event);
        }
      }
      store.setStatus('failed');

      renderWithI18n(<ThoughtStream />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Could not check this photo/i)).toBeInTheDocument();
      expect(screen.getByText(/AI vision is busy/i)).toBeInTheDocument();
    });

    it('has zero axe accessibility violations while scanning and when completed', async () => {
      const store = useStreamStore.getState();
      store.setStreaming('scan-axe-test');

      const { container, unmount } = renderWithI18n(<ThoughtStream />);
      const scanAxe = await axe(container);
      expect(scanAxe).toHaveNoViolations();
      unmount();

      store.setStatus('completed');
      const { container: completedContainer } = renderWithI18n(<ThoughtStream />);
      const completedAxe = await axe(completedContainer);
      expect(completedAxe).toHaveNoViolations();
    });
  });
});
