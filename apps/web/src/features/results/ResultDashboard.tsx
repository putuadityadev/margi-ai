import { type ReactNode, useState, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { MsmeBundleItem as MsmeBundleItemType } from '@margi-ai/shared';
import { Button, BookmarkIcon, GlobeIcon, ShareLinkIcon, StoreIcon } from '../../components/ui';
import { ToastRegion, type ToastItem } from '../../components/ui/Toast';
import { useStreamStore } from '../../stores/streamStore';
import { ThoughtStream } from '../stream/ThoughtStream';
import { OriginSummary } from './OriginSummary';
import { DualHistogram } from './DualHistogram';
import { RouteTabs } from './RouteTabs';
import { MsmeBundleItem } from './MsmeBundleItem';
import { Disclaimers } from './Disclaimers';
import { SimulationBanner, ReplayBanner } from './Banners';
import { SaveTripButton } from '../trips/SaveTripButton';
import { track } from '../../lib/track';

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
  onRegenerateLocale,
  className = '',
}: ResultDashboardProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const currentLang = i18n.language.startsWith('id') ? 'id' : 'en';
  const isId = currentLang === 'id';

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const sections = useStreamStore((s) => s.sections);
  const result = useStreamStore((s) => s.result);
  const activeCardId = useStreamStore((s) => s.activeCardId);
  const setActiveCardId = useStreamStore((s) => s.setActiveCardId);

  const originData = result?.origin ?? sections.origin;
  const recommendationsData = result
    ? { micro: result.micro, regional: result.regional }
    : sections.recommendations;

  const allCards = useMemo(() => {
    if (!recommendationsData) return [];
    return [...recommendationsData.micro, ...recommendationsData.regional];
  }, [recommendationsData]);

  const activeAlternative = useMemo(() => {
    if (!allCards.length) return undefined;
    if (activeCardId) {
      const found = allCards.find((c) => c.venue.id === activeCardId);
      if (found) return found;
    }
    return allCards[0];
  }, [allCards, activeCardId]);

  const activePlaceName = activeAlternative
    ? isId
      ? activeAlternative.venue.nameId || activeAlternative.venue.nameEn
      : activeAlternative.venue.nameEn || activeAlternative.venue.nameId
    : '';

  // Compile nearby MSMEs: prioritize selected similar place, and append unique MSMEs from other cards if needed
  const nearbyMsmes = useMemo(() => {
    const entries: Array<{ item: MsmeBundleItemType; nearName: string }> = [];
    const seen = new Set<string>();

    if (activeAlternative) {
      const nearName = isId
        ? activeAlternative.venue.nameId || activeAlternative.venue.nameEn
        : activeAlternative.venue.nameEn || activeAlternative.venue.nameId;
      for (const m of activeAlternative.msme) {
        if (!seen.has(m.venue.id)) {
          seen.add(m.venue.id);
          entries.push({ item: m, nearName });
        }
      }
    }

    for (const card of allCards) {
      if (activeAlternative && card.venue.id === activeAlternative.venue.id) continue;
      const nearName = isId
        ? card.venue.nameId || card.venue.nameEn
        : card.venue.nameEn || card.venue.nameId;
      for (const m of card.msme) {
        if (!seen.has(m.venue.id) && entries.length < 4) {
          seen.add(m.venue.id);
          entries.push({ item: m, nearName });
        }
      }
    }

    return entries;
  }, [activeAlternative, allCards, isId]);

  const handleCopyLink = async (): Promise<void> => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const permalink = `${origin}/app/a/${analysisId}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(permalink);
      }
      track('permalink_copied', { analysisId });

      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          message: t('linkCopied', 'Link copied to clipboard!'),
          tone: 'dark',
        },
      ]);
    } catch {
      // Ignore clipboard failure
    }
  };

  const dismissToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showRegenerateLanguage = Boolean(
    result && result.locale && result.locale !== currentLang,
  );

  return (
    <div
      className={`space-y-6 pb-12 ${className}`}
      data-testid="result-dashboard"
    >
      {/* 1. Clean Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewAnalysis}
          className="text-xs border border-ash bg-white hover:bg-parchment"
          data-testid="new-analysis-button"
        >
          ← {t('newAnalysis', isId ? 'Cek Foto Lain' : 'Scan Another')}
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {showRegenerateLanguage ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerateLocale?.(currentLang)}
              className="text-xs border border-ash bg-white hover:bg-parchment"
              data-testid="regenerate-locale-button"
            >
              <GlobeIcon size={14} />
              <span>
                {t('regenerateIn', 'Translate ({{lang}})', {
                  lang: currentLang.toUpperCase(),
                })}
              </span>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border border-ash bg-white hover:bg-parchment"
            data-testid="copy-link-button"
          >
            <ShareLinkIcon size={14} />
            <span>{t('copyLink', isId ? 'Bagikan' : 'Share')}</span>
          </Button>

          {activeAlternative ? (
            <SaveTripButton
              analysisId={analysisId}
              venueId={activeAlternative.venue.id}
              venueName={activePlaceName}
              msmeVenueIds={activeAlternative.msme.map((m) => m.venue.id)}
              msmeNames={activeAlternative.msme.map((m) =>
                isId ? m.venue.nameId : m.venue.nameEn,
              )}
              onClick={onSaveTrip}
              onSaved={() => {
                setToasts((prev) => [
                  ...prev,
                  {
                    id: `toast-${Date.now()}`,
                    message: t('tripSavedSuccess', 'Trip plan saved!'),
                    tone: 'dark',
                  },
                ]);
              }}
            />
          ) : originData ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveTrip}
              className="text-xs"
              data-testid="save-trip-button"
            >
              <BookmarkIcon size={14} />
              <span>{t('saveTrip', isId ? 'Simpan' : 'Save')}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2. Honest Status Notice (Simulation / Replay) */}
      {result?.simulate && result.simulation ? (
        <SimulationBanner surgePct={result.simulation.surgePct} />
      ) : null}
      {result?.meta?.isReplay ? <ReplayBanner /> : null}

      {/* 3. Animated Person Scanning View (collapses to quiet 1-line once complete) */}
      <ThoughtStream />

      {/* 4. Simple Traffic Report + Hourly Chart */}
      {originData ? (
        <div className="space-y-4">
          <OriginSummary
            origin={originData}
            insight={result?.insight ?? sections.recommendations?.insight}
          />
          <DualHistogram
            origin={originData}
            activeCard={activeAlternative}
            arrivalHour={
              result?.input?.arrivalAt
                ? new Date(result.input.arrivalAt).getHours()
                : 9
            }
          />
        </div>
      ) : null}

      {/* 5. Similar Calmer Places Recommendations */}
      {recommendationsData ? (
        <RouteTabs
          microCards={recommendationsData.micro}
          regionalCards={recommendationsData.regional}
          activeCardId={activeCardId ?? activeAlternative?.venue.id}
          onSelectCard={setActiveCardId}
        />
      ) : null}

      {/* 6. Interactive Map + Nearby Local MSMEs Directly Below */}
      {originData && recommendationsData ? (
        <div className="space-y-4" data-testid="map-and-msme-section">
          <Suspense
            fallback={
              <div className="h-72 rounded-card bg-parchment border border-ash flex items-center justify-center text-xs text-graphite">
                {isId ? 'Memuat peta interaktif...' : 'Loading interactive map...'}
              </div>
            }
          >
            <MapView
              origin={{
                id: originData.venue.id,
                name:
                  (isId
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

          {/* Nearby Local MSMEs List */}
          {nearbyMsmes.length > 0 ? (
            <section
              aria-label={isId ? 'Daftar UMKM Terdekat' : 'Nearby Local Businesses'}
              className="rounded-card bg-white border border-ash p-5 sm:p-6 space-y-4"
              data-testid="nearby-msme-section"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StoreIcon size={18} className="text-ink" />
                    <h3 className="text-subheading font-medium text-ink">
                      {t('msmeBundle', isId ? 'UMKM Lokal Terdekat' : 'Nearby Local Spots')}
                    </h3>
                  </div>
                  <p className="text-xs text-graphite mt-0.5">
                    {activePlaceName
                      ? isId
                        ? `Warung, kopi & kerajinan warga di sekitar ${activePlaceName}`
                        : `Family-run warungs, coffee & crafts around ${activePlaceName}`
                      : isId
                        ? 'Mampir dan dukung usaha warga lokal di sepanjang rute Anda'
                        : 'Stop by and support family-owned spots along your route'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nearbyMsmes.map(({ item, nearName }) => (
                  <MsmeBundleItem
                    key={item.venue.id}
                    item={item}
                    nearVenueName={nearName}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* 7. Quiet Single-Line Travel Note */}
      {originData ? <Disclaimers disclaimers={result?.disclaimers} /> : null}

      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
