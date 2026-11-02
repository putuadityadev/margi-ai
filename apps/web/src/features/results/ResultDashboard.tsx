import { type ReactNode, useState, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ToastRegion, type ToastItem } from '../../components/ui/Toast';
import { useStreamStore } from '../../stores/streamStore';
import { ThoughtStream } from '../stream/ThoughtStream';
import { OriginSummary } from './OriginSummary';
import { VibeBreakdown } from './VibeBreakdown';
import { DualHistogram } from './DualHistogram';
import { RouteTabs } from './RouteTabs';
import { Disclaimers } from './Disclaimers';
import { SimulationBanner, ReplayBanner, RelaxedMatchBanner } from './Banners';
import { track } from '../../lib/track';

// Code-split MapView chunk so Leaflet is never loaded until recommendations exist (T-052)
const MapView = lazy(() =>
  import('./MapView').then((mod) => ({ default: mod.MapView })),
);

export interface ResultDashboardProps {
  readonly analysisId: string;
  readonly onNewAnalysis?: (() => void) | undefined;
  readonly onSaveTrip?: (() => void) | undefined;
  readonly onReRunWithSimulation?: (() => void) | undefined;
  readonly onRegenerateLocale?: ((locale: 'en' | 'id') => void) | undefined;
  readonly className?: string | undefined;
}

export function ResultDashboard({
  analysisId,
  onNewAnalysis,
  onSaveTrip,
  onReRunWithSimulation,
  onRegenerateLocale,
  className = '',
}: ResultDashboardProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const currentLang = i18n.language.startsWith('id') ? 'id' : 'en';

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const sections = useStreamStore((s) => s.sections);
  const result = useStreamStore((s) => s.result);
  const activeCardId = useStreamStore((s) => s.activeCardId);
  const setActiveCardId = useStreamStore((s) => s.setActiveCardId);

  // Progressive section payloads
  const vibeData = result?.vibe ?? sections.vibe;
  const originData = result?.origin ?? sections.origin;
  const recommendationsData = result
    ? { micro: result.micro, regional: result.regional }
    : sections.recommendations;

  const allCards = useMemo(() => {
    if (!recommendationsData) return [];
    return [...recommendationsData.micro, ...recommendationsData.regional];
  }, [recommendationsData]);

  // Active alternative card for DualHistogram comparison
  const activeAlternative = useMemo(() => {
    if (!allCards.length) return undefined;
    if (activeCardId) {
      const found = allCards.find((c) => c.venue.id === activeCardId);
      if (found) return found;
    }
    return allCards[0];
  }, [allCards, activeCardId]);

  // Toast handler for copy permalink
  const handleCopyLink = async (): Promise<void> => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const permalink = `${origin}/app/a/${analysisId}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(permalink);
      }
      track('permalink_copied', { analysisId });

      const newToast: ToastItem = {
        id: `toast-${Date.now()}`,
        message: t('linkCopied', 'Link copied to clipboard!'),
        tone: 'dark',
      };
      setToasts((prev) => [...prev, newToast]);
    } catch {
      // Fallback
    }
  };

  const dismissToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Locale discrepancy check
  const showRegenerateLanguage = Boolean(
    result && result.locale && result.locale !== currentLang,
  );

  return (
    <div
      className={`space-y-8 pb-28 md:pb-12 ${className}`}
      data-testid="result-dashboard"
    >
      {/* 1. Dashboard Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-card bg-parchment border border-ash/80">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewAnalysis}
            className="text-xs"
            data-testid="new-analysis-button"
          >
            ← {t('newAnalysis', 'New Analysis')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border border-ash bg-white hover:bg-parchment"
            data-testid="copy-link-button"
          >
            📋 {t('copyLink', 'Copy Link')}
          </Button>

          {/* Re-run with simulation if not simulated yet */}
          {result && !result.simulate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReRunWithSimulation}
              className="text-xs border border-ash bg-white hover:bg-parchment"
              data-testid="rerun-sim-button"
            >
              ⚡ {t('reRunWithSim', 'Re-run with Simulation')}
            </Button>
          ) : null}

          {/* Regenerate in active language if changed after run */}
          {showRegenerateLanguage ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerateLocale?.(currentLang)}
              className="text-xs border border-ash bg-white hover:bg-parchment"
              data-testid="regenerate-locale-button"
            >
              🌐{' '}
              {t('regenerateIn', 'Regenerate in {{lang}}', {
                lang: currentLang.toUpperCase(),
              })}
            </Button>
          ) : null}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveTrip}
            className="text-xs"
            data-testid="save-trip-button"
          >
            💾 {t('saveTrip', 'Save Trip')}
          </Button>
        </div>
      </div>

      {/* 2. Top Status Banners (Simulation / Replay / Relaxed) */}
      <div className="space-y-3">
        {result?.simulate && result.simulation ? (
          <SimulationBanner
            surgePct={result.simulation.surgePct}
          />
        ) : null}

        {result?.meta?.isReplay ? <ReplayBanner /> : null}

        {result?.meta?.relaxedStep && result.meta.relaxedStep > 0 ? (
          <RelaxedMatchBanner
            step={result.meta.relaxedStep}
            reasons={[]}
          />
        ) : null}
      </div>

      {/* 3. Section 1: Glass-Box ThoughtStream (PRD AC-09.1) */}
      <ThoughtStream />

      {/* 4. Section 2: Origin Summary (Appears as soon as origin is resolved) */}
      {originData ? (
        <OriginSummary
          origin={originData}
          insight={result?.insight ?? sections.recommendations?.insight}
        />
      ) : null}

      {/* 5. Section 3: Vibe Breakdown (Appears as soon as vibe is resolved) */}
      {vibeData ? (
        <VibeBreakdown
          vibe={vibeData}
          referenceImageUrl={result?.input?.origin?.imageUrl}
        />
      ) : null}

      {/* 6. Section 4: Dual Histogram (Hour-by-hour comparison) */}
      {originData ? (
        <DualHistogram
          origin={originData}
          activeCard={activeAlternative}
          arrivalHour={
            result?.input?.arrivalAt
              ? new Date(result.input.arrivalAt).getHours()
              : 9
          }
        />
      ) : null}

      {/* 7. Section 5: Route Tabs & Route Cards */}
      {recommendationsData ? (
        <RouteTabs
          microCards={recommendationsData.micro}
          regionalCards={recommendationsData.regional}
          activeCardId={activeCardId ?? activeAlternative?.venue.id}
          onSelectCard={setActiveCardId}
        />
      ) : null}

      {/* 8. Section 6: Interactive Route Map (Lazy loaded chunk) */}
      {originData && recommendationsData ? (
        <Suspense
          fallback={
            <div className="h-80 rounded-card bg-parchment border border-ash flex items-center justify-center font-mono text-xs text-graphite">
              Loading map...
            </div>
          }
        >
          <MapView
            origin={{
              id: originData.venue.id,
              name:
                (currentLang === 'id'
                  ? originData.venue.nameId
                  : originData.venue.nameEn) || originData.venue.slug,
              lat: originData.venue.lat,
              lng: originData.venue.lng,
            }}
            alternatives={allCards}
            activeCardId={activeCardId ?? activeAlternative?.venue.id}
            onSelectCard={setActiveCardId}
          />
        </Suspense>
      ) : null}

      {/* 9. Section 7: Disclaimers & Responsible Travel */}
      <Disclaimers disclaimers={result?.disclaimers} />

      {/* 10. Mobile Sticky Action Bar (PRD AC-09.4) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-ash flex items-center justify-between gap-2 safe-area-pb">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          className="flex-1 text-xs border border-ash bg-white"
        >
          📋 {t('copyLink', 'Copy Link')}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onSaveTrip}
          className="flex-1 text-xs"
        >
          💾 {t('saveTrip', 'Save Trip')}
        </Button>
      </div>

      {/* Toast Region */}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
