import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Map as MapIcon, Plus } from 'lucide-react';
import type { NearbyPlace } from '@margi-ai/shared';
import { CrowdMeter } from '../../components/data/CrowdMeter';
import { cn } from '../../lib/cn';
import { crowdLevelKey, placeName } from '../explore/placeText';

export interface ChatPlaceCardProps {
  readonly place: NearbyPlace;
  readonly inPlan: boolean;
  readonly onTogglePlan: (place: NearbyPlace) => void;
  readonly onShowOnMap: (place: NearbyPlace) => void;
}

/** A place MARGI mentioned: crowd now, distance, and one tap to add it to a plan or see it on the map. */
export function ChatPlaceCard({
  place,
  inPlan,
  onTogglePlan,
  onShowOnMap,
}: ChatPlaceCardProps): ReactNode {
  const { t, i18n } = useTranslation('app');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const name = placeName(place.venue, isId);
  const level = tExplore(`crowd.levels.${crowdLevelKey(place.crowd)}`);
  const hasForecast = place.venue.kind !== 'OTHER';
  const crowdText = !hasForecast
    ? t('chat.noForecast')
    : place.isOpenNow
      ? t('chat.crowdNow', { level, pct: place.crowd.busynessPct })
      : t('chat.closed');

  return (
    <li className="w-[232px] flex-none snap-start border border-ink bg-white">
      <div className="h-20 overflow-hidden bg-parchment">
        <img
          src={place.venue.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-body font-medium text-ink">{name}</p>
        <p className="truncate font-mono text-[11px] text-graphite">
          {tExplore(`categories.${place.venue.category}`)} ·{' '}
          {tExplore('browse.km', { value: place.distanceKm.toFixed(1) })} ·{' '}
          {tExplore('browse.minutes', { count: place.travelMinutes })}
        </p>
        {hasForecast ? (
          <div className="flex items-center gap-2">
            <CrowdMeter
              busynessPct={place.isOpenNow ? place.crowd.busynessPct : 0}
              label={crowdText}
              className="flex-1"
            />
            <span className="flex-none text-caption text-ink">{crowdText}</span>
          </div>
        ) : (
          <p className="text-caption text-graphite">{crowdText}</p>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            aria-pressed={inPlan}
            onClick={() => onTogglePlan(place)}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 border border-ink text-body-sm font-medium',
              inPlan ? 'bg-ink text-white' : 'bg-lime text-ink',
            )}
          >
            {inPlan ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Plus size={14} aria-hidden="true" />
            )}
            {inPlan ? t('chat.inPlan') : t('chat.addToPlan')}
          </button>
          <button
            type="button"
            onClick={() => onShowOnMap(place)}
            aria-label={`${t('chat.showOnMap')}: ${name}`}
            className="flex h-10 w-10 items-center justify-center border border-ink bg-white text-ink"
          >
            <MapIcon size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}
