import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Route as RouteIcon, Store } from 'lucide-react';
import type { FeedCard } from '@margi-ai/shared';
import { CrowdMeter } from '../../components/data/CrowdMeter';
import { crowdLevelKey, hourLabel, placeName } from '../explore/placeText';
import { HourBars } from './HourBars';

export interface FeedCardViewProps {
  readonly card: FeedCard;
  readonly onPlan: (card: FeedCard) => void;
  readonly onShowOnMap: (card: FeedCard) => void;
}

/** One full-height card of the feed: photo, the crowd story, the hourly forecast, and two actions. */
export function FeedCardView({ card, onPlan, onShowOnMap }: FeedCardViewProps): ReactNode {
  const { t, i18n } = useTranslation('app');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const { place, instead, msme } = card;
  const name = placeName(place.venue, isId);
  const level = tExplore(`crowd.levels.${crowdLevelKey(place.crowd)}`);
  const quiet = card.quietHours.map((hour) => hourLabel(hour, isId)).join(', ');

  return (
    <article
      aria-label={name}
      className="flex h-full snap-start flex-col overflow-hidden border-b border-ink bg-white md:mx-auto md:max-w-xl md:border-x"
    >
      <div className="relative min-h-0 flex-[5] bg-parchment">
        <img
          src={place.venue.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 border border-ink bg-lime px-2 py-1 font-mono text-[11px] uppercase text-ink">
          {card.kind === 'INSTEAD_OF' ? t('feed.badgeInstead') : t('feed.badgeCalm')}
        </span>
        {place.venue.imageCredit && (
          <span className="absolute bottom-1 right-1 max-w-[70%] truncate bg-white/85 px-1 text-[9px] text-graphite">
            {place.venue.imageCredit}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-[6] flex-col gap-3 overflow-y-auto p-4">
        <div>
          <h2 className="text-heading font-medium leading-tight text-ink">{name}</h2>
          <p className="mt-0.5 font-mono text-caption text-graphite">
            {tExplore(`categories.${place.venue.category}`)} ·{' '}
            {tExplore('browse.km', { value: place.distanceKm.toFixed(1) })} ·{' '}
            {tExplore('browse.minutes', { count: place.travelMinutes })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CrowdMeter
            busynessPct={place.crowd.busynessPct}
            label={`${level} ${place.crowd.busynessPct}%`}
            className="flex-1"
          />
          <span className="flex-none text-body-sm font-medium text-ink">
            {level} {place.crowd.busynessPct}%
          </span>
        </div>

        {instead && (
          <p className="border-l-2 border-ink bg-parchment px-3 py-2 text-body-sm text-ink">
            {t('feed.insteadLine', {
              name: placeName(instead.place.venue, isId),
              pct: instead.place.crowd.busynessPct,
              drop: instead.crowdDropPts,
              similarity: instead.similarity,
            })}
          </p>
        )}

        <HourBars
          today={card.today}
          quietHours={card.quietHours}
          currentHour={place.crowd.hourWita}
          isId={isId}
          label={t('feed.chartLabel', { name, hours: quiet })}
        />
        {quiet && (
          <p className="text-caption text-graphite">{t('feed.quietAt', { hours: quiet })}</p>
        )}

        {msme && (
          <p className="flex items-start gap-2 text-body-sm text-ink">
            <Store size={16} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>
              {t('feed.msme', {
                name: placeName(msme.venue, isId),
                km: msme.distanceKm.toFixed(1),
              })}
            </span>
          </p>
        )}

        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-1">
          <button
            type="button"
            onClick={() => onPlan(card)}
            className="flex h-12 items-center justify-center gap-2 border border-ink bg-lime text-body font-medium text-ink"
          >
            <RouteIcon size={16} aria-hidden="true" />
            {t('feed.plan')}
          </button>
          <button
            type="button"
            onClick={() => onShowOnMap(card)}
            aria-label={t('feed.map')}
            className="flex h-12 w-12 items-center justify-center border border-ink bg-white text-ink"
          >
            <MapIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
