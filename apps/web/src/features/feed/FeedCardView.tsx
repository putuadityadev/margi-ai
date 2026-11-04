import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Route as RouteIcon } from 'lucide-react';
import type { FeedCard } from '@margi-ai/shared';
import { crowdLevelKey, hourLabel, placeName, regencyLabel } from '../explore/placeText';

export interface FeedCardViewProps {
  readonly card: FeedCard;
  /** Distances are only meaningful once the traveller has a starting point. */
  readonly showDistance: boolean;
  readonly onPlan: (card: FeedCard) => void;
  readonly onShowOnMap: (card: FeedCard) => void;
}

/** One full-screen card: the photo leads, a short caption sits at the bottom, actions on the right. */
export function FeedCardView({
  card,
  showDistance,
  onPlan,
  onShowOnMap,
}: FeedCardViewProps): ReactNode {
  const { t, i18n } = useTranslation('app');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const { place, calmer } = card;
  const name = placeName(place.venue, isId);
  const level = tExplore(`crowd.levels.${crowdLevelKey(place.crowd)}`);
  const crowdText = place.isOpenNow
    ? `${level} ${place.crowd.busynessPct}%`
    : tExplore('browse.closed');
  const quiet = card.quietHours.length > 0 ? hourLabel(card.quietHours[0] ?? 0, isId) : null;

  return (
    <article aria-label={name} className="relative h-full snap-start overflow-hidden bg-ink">
      <img
        src={place.venue.imageUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {place.venue.imageCredit && (
        <span className="absolute left-2 top-2 max-w-[60%] truncate bg-white/85 px-1 text-[9px] text-graphite">
          {place.venue.imageCredit}
        </span>
      )}

      <div className="absolute bottom-5 right-3 z-[1] flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onPlan(card)}
          aria-label={`${t('feed.plan')}: ${name}`}
          className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 border border-ink bg-lime text-ink"
        >
          <RouteIcon size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">{t('feed.planShort')}</span>
        </button>
        <button
          type="button"
          onClick={() => onShowOnMap(card)}
          aria-label={`${t('feed.map')}: ${name}`}
          className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 border border-ink bg-white text-ink"
        >
          <MapIcon size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">{t('feed.mapShort')}</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-ink/85 p-4 pr-20 text-white">
        <p className="font-mono text-caption uppercase tracking-normal text-white/70">
          {tExplore(`categories.${place.venue.category}`)} · {regencyLabel(place.venue.regencyId)}
          {showDistance && ` · ${tExplore('browse.km', { value: place.distanceKm.toFixed(0) })}`}
        </p>
        <h2 className="mt-1 text-heading font-medium leading-tight">{name}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
          <span className="border border-white/70 px-2 py-0.5">{crowdText}</span>
          {quiet && <span className="text-white/80">{t('feed.quietFrom', { time: quiet })}</span>}
        </p>
        {calmer && (
          <p className="mt-2 text-body-sm text-lime">
            {t('feed.calmerLine', {
              name: placeName(calmer.place.venue, isId),
              pct: calmer.place.crowd.busynessPct,
              drop: calmer.crowdDropPts,
            })}
          </p>
        )}
      </div>
    </article>
  );
}
