import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { FeedCard, GeoPoint } from '@margi-ai/shared';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Spinner } from '../../components/ui';
import { OriginQuickPick } from '../../features/explore/OriginQuickPick';
import { useFeedPages, useReverseGeocode } from '../../features/explore/queries';
import { FeedCardView } from '../../features/feed/FeedCardView';
import { nowWitaIso } from '../../features/trip/tripStart';
import { defaultVisitWindow, useExploreStore, visitInstant } from '../../stores/exploreStore';
import { useTripStore } from '../../stores/tripStore';

const SEED_KEY = 'margi_feed_seed';
const SCROLL_KEY = 'margi_feed_scroll';
/** Fetch the next page when fewer than this many screens remain below the viewer. */
const PREFETCH_SCREENS = 3;

function sessionValue(key: string, create: () => string): string {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored) return stored;
    const value = create();
    window.sessionStorage.setItem(key, value);
    return value;
  } catch {
    return create();
  }
}

/** One order per browser tab session, so coming back to the feed continues the same sequence. */
const FEED_SEED = sessionValue(SEED_KEY, () => Math.random().toString(36).slice(2, 10));

/**
 * Endless, full-screen feed of every destination (scroll first, decide later). No location is
 * needed to browse; planning from a card asks for a starting point only at that moment.
 */
export function FeedPage(): ReactNode {
  const { t, i18n } = useTranslation('app');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();
  const origin = useExploreStore((state) => state.origin);
  const goTo = useExploreStore((state) => state.goTo);
  const startTrip = useTripStore((state) => state.start);
  // At night a visit "now" is pointless, so crowd and plans target the next morning.
  const at = useMemo(() => visitInstant(defaultVisitWindow()), []);
  const reverse = useReverseGeocode(origin);
  const feed = useFeedPages(FEED_SEED, origin, at);
  const [pending, setPending] = useState<FeedCard | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const cards = useMemo(() => feed.data?.pages.flatMap((page) => page.cards) ?? [], [feed.data]);
  const areaName = reverse.data
    ? isId
      ? reverse.data.area.nameId
      : reverse.data.area.nameEn
    : null;

  // Coming back from a plan or the map, return to the card the traveller was looking at.
  useEffect(() => {
    if (restored.current || cards.length === 0 || !scroller.current) return;
    restored.current = true;
    try {
      const saved = Number(window.sessionStorage.getItem(SCROLL_KEY));
      if (saved > 0) scroller.current.scrollTop = saved;
    } catch {
      // Without storage the feed simply starts at the top.
    }
  }, [cards.length]);

  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = feed;
  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      const element = event.currentTarget;
      try {
        window.sessionStorage.setItem(SCROLL_KEY, String(element.scrollTop));
      } catch {
        // Not remembering the position is harmless.
      }
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (
        remaining < element.clientHeight * PREFETCH_SCREENS &&
        hasNextPage &&
        !isFetchingNextPage &&
        !isError
      ) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, isError, fetchNextPage],
  );

  const startPlan = useCallback(
    (card: FeedCard, from: GeoPoint): void => {
      startTrip(
        {
          origin: from,
          originLabel: areaName ?? t('feed.yourLocation'),
          departAt: at ?? nowWitaIso(),
          stops: [{ venueId: card.place.venue.id }],
        },
        'PLAN',
      );
      void navigate('/app/trip');
    },
    [areaName, at, navigate, startTrip, t],
  );

  const plan = (card: FeedCard): void => {
    if (origin) startPlan(card, origin);
    else setPending(card);
  };

  // The traveller picked a starting point for the card they tapped: carry on into the planner.
  useEffect(() => {
    if (pending && origin) startPlan(pending, origin);
  }, [pending, origin, startPlan]);

  const showOnMap = (card: FeedCard): void => {
    goTo(origin ? 'browse' : 'locate');
    void navigate(origin ? `/app?place=${card.place.venue.id}` : '/app');
  };

  return (
    <main id="main-content" className="absolute inset-0 flex flex-col bg-ink">
      <PageHeader title={t('feed.title')} subtitle={t('feed.subtitle')} />

      <div className="relative min-h-0 flex-1">
        {feed.isLoading && (
          <div className="flex h-full items-center justify-center bg-parchment">
            <Spinner size="lg" />
          </div>
        )}

        {feed.isError && cards.length === 0 && (
          <div role="alert" className="h-full bg-parchment p-6">
            <div className="mx-auto max-w-md space-y-3 border border-ink bg-white p-6">
              <p className="text-body-sm text-ink">{t('feed.error')}</p>
              <button
                type="button"
                onClick={() => void feed.refetch()}
                className="h-11 w-full border border-ink text-body text-ink"
              >
                {t('retry')}
              </button>
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div
            ref={scroller}
            onScroll={onScroll}
            tabIndex={0}
            aria-label={t('feed.title')}
            className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {cards.map((card, index) => (
              <div key={`${card.place.venue.id}-${index}`} className="h-full snap-start">
                <FeedCardView
                  card={card}
                  showDistance={origin !== null}
                  onPlan={plan}
                  onShowOnMap={showOnMap}
                />
              </div>
            ))}
            <div className="flex h-24 snap-end items-center justify-center bg-ink text-white">
              {feed.isError ? (
                <button
                  type="button"
                  onClick={() => void feed.fetchNextPage()}
                  className="h-11 border border-white px-4 text-body-sm"
                >
                  {t('feed.moreError')}
                </button>
              ) : (
                <Spinner size="md" />
              )}
            </div>
          </div>
        )}

        {pending && !origin && (
          <div
            role="dialog"
            aria-label={t('feed.chooseStartTitle')}
            className="absolute inset-x-0 bottom-0 z-10 space-y-3 border-t border-ink bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-subheading font-medium text-ink">
                  {t('feed.chooseStartTitle')}
                </h2>
                <p className="text-body-sm text-graphite">{t('feed.chooseStartBody')}</p>
              </div>
              <button
                type="button"
                onClick={() => setPending(null)}
                aria-label={t('feed.close')}
                className="flex h-10 w-10 flex-none items-center justify-center border border-ink"
              >
                <X size={16} />
              </button>
            </div>
            <OriginQuickPick />
          </div>
        )}
      </div>
    </main>
  );
}
