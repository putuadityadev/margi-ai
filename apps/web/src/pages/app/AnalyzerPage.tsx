import { useState, useEffect, type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router';
import type { AnalysisResult } from '@margi-ai/shared';
import { Pill } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { AnalyzerInputPanel } from '../../features/analyzer/AnalyzerInputPanel';
import { ResultDashboard } from '../../features/results/ResultDashboard';
import { useAnalysisStream } from '../../features/stream/useAnalysisStream';
import { useStreamStore } from '../../stores/streamStore';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { track } from '../../lib/track';

export function AnalyzerPage(): ReactNode {
  const { t } = useTranslation('analyzer');
  const { t: tRes } = useTranslation('results');
  const params = useParams<{ analysisId?: string }>();
  const navigate = useNavigate();

  const urlAnalysisId = params.analysisId;

  // Stream hook for running analyses
  const {
    start: startStream,
    status: streamStatus,
    analysisId: streamAnalysisId,
  } = useAnalysisStream();

  const resetStream = useStreamStore((s) => s.reset);
  const setResult = useStreamStore((s) => s.setResult);
  const setSimulateStore = useAnalyzerStore((s) => s.setSimulate);
  const resetAnalyzer = useAnalyzerStore((s) => s.reset);

  // State for /app/a/:analysisId permalink loader
  const [permalinkLoading, setPermalinkLoading] = useState<boolean>(Boolean(urlAnalysisId));
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [permalinkError, setPermalinkError] = useState<string | null>(null);

  // Load stored analysis if navigating directly to /app/a/:analysisId
  useEffect(() => {
    if (!urlAnalysisId) {
      setPermalinkLoading(false);
      return;
    }

    let isMounted = true;
    setPermalinkLoading(true);
    setIsPrivate(false);
    setPermalinkError(null);

    async function loadAnalysis(): Promise<void> {
      try {
        const result = await apiClient<AnalysisResult>(`/analyses/${urlAnalysisId}`);
        if (!isMounted) return;

        setResult(result);
        if (urlAnalysisId) {
          useStreamStore.getState().setStreaming(urlAnalysisId);
        }
        useStreamStore.getState().setStatus('completed');
        setPermalinkLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setPermalinkLoading(false);

        if (err instanceof ApiClientError && (err.status === 403 || err.code === 'FORBIDDEN')) {
          setIsPrivate(true);
        } else {
          setPermalinkError(
            err instanceof Error ? err.message : 'Failed to load analysis result.',
          );
        }
      }
    }

    void loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, [urlAnalysisId, setResult]);

  const handleStartAnalysis = useCallback((): void => {
    void startStream();
  }, [startStream]);

  const handleNewAnalysis = useCallback((): void => {
    resetStream();
    resetAnalyzer();
    if (urlAnalysisId) {
      void navigate('/app');
    }
  }, [resetStream, resetAnalyzer, urlAnalysisId, navigate]);

  const handleReRunWithSimulation = useCallback((): void => {
    setSimulateStore(true);
    void startStream();
  }, [setSimulateStore, startStream]);

  const handleRegenerateLocale = useCallback(
    async (locale: 'en' | 'id'): Promise<void> => {
      const activeId = urlAnalysisId ?? streamAnalysisId;
      if (!activeId) return;

      try {
        const updated = await apiClient<AnalysisResult>(
          `/analyses/${activeId}/regenerate-narrative`,
          {
            method: 'POST',
            body: { locale },
          },
        );
        setResult(updated);
        track('analysis_regenerated_locale', { analysisId: activeId, locale });
      } catch {
        // Fallback
      }
    },
    [urlAnalysisId, streamAnalysisId, setResult],
  );

  const handleSaveTrip = useCallback((): void => {
    const activeId = urlAnalysisId ?? streamAnalysisId;
    track('save_trip_clicked', { analysisId: activeId });
  }, [urlAnalysisId, streamAnalysisId]);

  // View: Permalink Loading State
  if (permalinkLoading) {
    return (
      <div
        className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 text-center space-y-4"
        data-testid="permalink-loading"
      >
        <Spinner size="lg" className="mx-auto text-ink" />
        <p className="text-body text-graphite font-mono">Restoring analysis result...</p>
      </div>
    );
  }

  // View: Private Analysis State (PRD §5 / Clarification C-12 / D-024)
  if (isPrivate) {
    return (
      <div
        className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6"
        data-testid="private-analysis-view"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-parchment border border-ash flex items-center justify-center text-2xl">
          🔒
        </div>
        <div className="space-y-2">
          <h1 className="text-heading font-medium text-ink">
            {tRes('privateAnalysis', 'This analysis is private')}
          </h1>
          <p className="text-body text-graphite max-w-md mx-auto">
            {tRes(
              'privateAnalysisDesc',
              'This recommendation was generated privately for another traveler. Start your own analysis to receive personalized route options.',
            )}
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleNewAnalysis}
          data-testid="start-own-analysis-button"
        >
          {tRes('newAnalysis', 'Start New Analysis')}
        </Button>
      </div>
    );
  }

  // View: Permalink Fetch Error
  if (permalinkError) {
    return (
      <div
        className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6"
        data-testid="permalink-error-view"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-[#f9f0f0] border border-[#e0442b]/30 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-heading font-medium text-ink">Analysis Not Found</h1>
          <p className="text-body text-graphite max-w-md mx-auto">{permalinkError}</p>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={handleNewAnalysis}
          className="border border-ash bg-white"
          data-testid="error-new-analysis-button"
        >
          {tRes('newAnalysis', 'Start New Analysis')}
        </Button>
      </div>
    );
  }

  // View: Active Stream or Completed Result Dashboard
  const isRunningOrHasResults =
    streamStatus !== 'idle' || Boolean(useStreamStore.getState().result);

  if (isRunningOrHasResults) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <ResultDashboard
          analysisId={urlAnalysisId ?? streamAnalysisId ?? 'active-analysis'}
          onNewAnalysis={handleNewAnalysis}
          onSaveTrip={handleSaveTrip}
          onReRunWithSimulation={handleReRunWithSimulation}
          onRegenerateLocale={handleRegenerateLocale}
        />
      </div>
    );
  }

  // View: Idle / Input Panel (Starting Flow A)
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 pb-28 md:pb-12">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Pill tone="dark">Autonomous Engine</Pill>
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-graphite">
            Multi-Agent Rerouting
          </span>
        </div>
        <h1 className="text-heading md:text-heading-lg font-medium tracking-tight text-ink">
          {t('title')}
        </h1>
        <p className="text-body text-graphite max-w-2xl font-normal leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <AnalyzerInputPanel onAnalyze={handleStartAnalysis} />
    </div>
  );
}
