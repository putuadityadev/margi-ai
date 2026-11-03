import { useState, useEffect, type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router';
import type { AnalysisResult } from '@margi-ai/shared';
import { Button, Spinner, LockIcon, AlertCircleIcon } from '../../components/ui';
import { AnalyzerInputPanel } from '../../features/analyzer/AnalyzerInputPanel';
import { ResultDashboard } from '../../features/results/ResultDashboard';
import { useAnalysisStream } from '../../features/stream/useAnalysisStream';
import { useStreamStore } from '../../stores/streamStore';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { track } from '../../lib/track';

export function AnalyzerPage(): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const { t: tRes } = useTranslation('results');
  const isId = i18n.language.startsWith('id');
  const params = useParams<{ analysisId?: string }>();
  const navigate = useNavigate();

  const urlAnalysisId = params.analysisId;

  const {
    start: startStream,
    status: streamStatus,
    analysisId: streamAnalysisId,
  } = useAnalysisStream();

  const resetStream = useStreamStore((s) => s.reset);
  const setResult = useStreamStore((s) => s.setResult);
  const storedResult = useStreamStore((s) => s.result);
  const setSimulateStore = useAnalyzerStore((s) => s.setSimulate);
  const resetAnalyzer = useAnalyzerStore((s) => s.reset);

  const [permalinkLoading, setPermalinkLoading] = useState<boolean>(Boolean(urlAnalysisId));
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [permalinkError, setPermalinkError] = useState<string | null>(null);

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
            err instanceof Error
              ? err.message
              : isId
                ? 'Hasil pemeriksaan tidak ditemukan.'
                : 'Could not load this report.',
          );
        }
      }
    }

    void loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, [urlAnalysisId, setResult, isId]);

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
        // Ignore transient regeneration errors
      }
    },
    [urlAnalysisId, streamAnalysisId, setResult],
  );

  const handleSaveTrip = useCallback((): void => {
    const activeId = urlAnalysisId ?? streamAnalysisId;
    track('save_trip_clicked', { analysisId: activeId });
  }, [urlAnalysisId, streamAnalysisId]);

  if (permalinkLoading) {
    return (
      <div
        className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center space-y-4"
        data-testid="permalink-loading"
      >
        <Spinner size="lg" className="mx-auto text-ink" />
        <p className="text-body-sm text-graphite">
          {isId ? 'Memuat laporan perjalanan...' : 'Loading report...'}
        </p>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div
        className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-6"
        data-testid="private-analysis-view"
      >
        <div className="w-14 h-14 mx-auto rounded-pill bg-parchment border border-ash flex items-center justify-center text-ink">
          <LockIcon size={22} />
        </div>
        <div className="space-y-2">
          <h1 className="text-heading font-medium text-ink">
            {tRes('privateAnalysis', 'This report is private')}
          </h1>
          <p className="text-body-sm text-graphite leading-relaxed">
            {tRes(
              'privateAnalysisDesc',
              'This recommendation belongs to another traveler. Upload a photo to check your own destination.',
            )}
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleNewAnalysis}
          data-testid="start-own-analysis-button"
        >
          {tRes('newAnalysis', 'Check Another Photo')}
        </Button>
      </div>
    );
  }

  if (permalinkError) {
    return (
      <div
        className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-6"
        data-testid="permalink-error-view"
      >
        <div className="w-14 h-14 mx-auto rounded-pill bg-parchment border border-ash flex items-center justify-center text-ink">
          <AlertCircleIcon size={22} />
        </div>
        <div className="space-y-2">
          <h1 className="text-heading font-medium text-ink">
            {isId ? 'Laporan Tidak Ditemukan' : 'Report Not Found'}
          </h1>
          <p className="text-body-sm text-graphite">{permalinkError}</p>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={handleNewAnalysis}
          className="border border-ash bg-white"
          data-testid="error-new-analysis-button"
        >
          {tRes('newAnalysis', 'Check Another Photo')}
        </Button>
      </div>
    );
  }

  const isRunningOrHasResults = streamStatus !== 'idle' || Boolean(storedResult);

  if (isRunningOrHasResults) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
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

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-heading font-medium tracking-tight text-ink">{t('title')}</h1>
        <p className="text-body-sm sm:text-body text-graphite font-normal leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <AnalyzerInputPanel onAnalyze={handleStartAnalysis} />
    </div>
  );
}
