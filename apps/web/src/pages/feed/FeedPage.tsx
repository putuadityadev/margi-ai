import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { RotateCw } from 'lucide-react';
import { VibeTagSchema, type FeedCard, type VibeTag } from '@margi-ai/shared';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Spinner } from '../../components/ui';
import { OriginQuickPick } from '../../features/explore/OriginQuickPick';
import { useFeed, useReverseGeocode } from '../../features/explore/queries';
import { FeedCardView } from '../../features/feed/FeedCardView';
import { clockLabel, dayOf } from '../../features/trip/tripText';
import { nowWitaIso } from '../../features/trip/tripStart';
import { cn } from '../../lib/cn';
import { defaultVisitWindow, useExploreStore, visitInstant } from '../../stores/exploreStore';
import { useTripStore } from '../../stores/tripStore';

/**
 * Discovery feed from the real forecast around the traveller's starting point. Each card links
 * straight into the planner or the map, so inspiration never dead-ends.
 */
export function FeedPage(): ReactNode {
  const { t, i18n } = useTranslation('app');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();
  const origin = useExploreStore((state) => state.origin);
  const goTo = useExploreStore((state) => state.goTo);
  const startTrip = useTripStore((state) => state.start);
  const [vibe, setVibe] = useState<VibeTag | null>(null);
  // At night a visit "now" is pointless, so the feed (and the plan) targets the next morning.
  const at = useMemo(() => visitInstant(defaultVisitWindow()), []);
  const reverse = useReverseGeocode(origin);
  const feed = useFeed(origin ? { origin, vibes: vibe ? [vibe] : [], at } : null);
  const areaName = reverse.data
    ? isId
      ? reverse.data.area.nameId
      : reverse.data.area.nameEn
    : null;

  const plan = (card: FeedCard): void => {
    if (!origin) return;
    startTrip(
      {
        origin,
        originLabel: areaName ?? t('feed.yourLocation'),
        departAt: at ?? nowWitaIso(),
        stops: [{ venueId: card.place.venue.id }],
      },
      'PLAN',
    );
    void navigate('/app/trip');
  };

  const showOnMap = (card: FeedCard): void => {
    goTo('browse');
    void navigate(`/app?place=${card.place.venue.id}`);
  };

  const subtitle = origin
    ? [
        areaName,
        at
          ? t('feed.forWhen', {
              when: `${dayOf(at) === 'today' ? t('feed.today') : t('feed.tomorrow')} ${clockLabel(at, isId)}`,
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('feed.subtitle');

  return (
    <main id="main-content" className="absolute inset-0 flex flex-col bg-parchment">
      <PageHeader
        title={t('feed.title')}
        subtitle={subtitle}
        actions={
          origin ? (
            <button
              type="button"
              onClick={() => void feed.refetch()}
              aria-label={t('feed.refresh')}
              disabled={feed.isFetching}
              className="flex h-11 w-11 flex-none items-center justify-center border border-ink bg-white text-ink disabled:opacity-50"
            >
              <RotateCw size={16} className={cn(feed.isFetching && 'animate-spin')} />
            </button>
          ) : null
        }
      />

      {origin && (
        <div
          role="group"
          aria-label={t('feed.filter')}
          className="flex flex-none gap-2 overflow-x-auto border-b border-ink bg-white px-4 py-2"
        >
          <Chip active={vibe === null} onClick={() => setVibe(null)}>
            {t('feed.allMoods')}
          </Chip>
          {VibeTagSchema.options.map((tag) => (
            <Chip
              key={tag}
              active={vibe === tag}
              onClick={() => setVibe(vibe === tag ? null : tag)}
            >
              {tExplore(`vibe.tags.${tag}`)}
            </Chip>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {!origin && (
          <div className="mx-auto max-w-md space-y-4 p-6">
            <div className="space-y-3 border border-ink bg-white p-6">
              <h2 className="text-subheading font-medium text-ink">{t('feed.needOriginTitle')}</h2>
              <p className="text-body-sm text-graphite">{t('feed.needOriginBody')}</p>
              <OriginQuickPick />
            </div>
          </div>
        )}

        {origin && feed.isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {origin && feed.isError && !feed.data && (
          <div role="alert" className="mx-auto max-w-md space-y-3 p-6">
            <div className="space-y-3 border border-ink bg-white p-6">
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

        {origin && feed.data?.cards.length === 0 && (
          <p className="p-6 text-body-sm text-graphite">{t('feed.empty')}</p>
        )}

        {origin && feed.data && feed.data.cards.length > 0 && (
          <div
            tabIndex={0}
            aria-label={t('feed.title')}
            className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {feed.data.cards.map((card) => (
              <div key={`${card.kind}-${card.place.venue.id}`} className="h-full snap-start">
                <FeedCardView card={card} onPlan={plan} onShowOnMap={showOnMap} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 flex-none border border-ink px-3 text-body-sm',
        active ? 'bg-ink text-white' : 'bg-white text-ink',
      )}
    >
      {children}
    </button>
  );
}
