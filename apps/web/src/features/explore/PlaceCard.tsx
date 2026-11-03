import type { ReactNode, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { NearbyPlace } from '@margi-ai/shared';
import { CrowdMeter } from '../../components/data/CrowdMeter';
import { cn } from '../../lib/cn';
import { crowdLevelKey, placeName } from './placeText';

export interface PlaceCardProps {
  readonly place: NearbyPlace;
  readonly isActive: boolean;
  readonly onOpen: (placeId: string) => void;
  readonly ref?: Ref<HTMLLIElement>;
}

/** Carousel card: photo, distance, and the crowd reading for the chosen visit time. */
export function PlaceCard({ place, isActive, onOpen, ref }: PlaceCardProps): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const name = placeName(place.venue, isId);
  const level = t(`crowd.levels.${crowdLevelKey(place.crowd)}`);
  const crowdText = place.isOpenNow ? `${level} ${place.crowd.busynessPct}%` : t('browse.closed');

  return (
    <li ref={ref} data-place-id={place.venue.id} className="w-[264px] flex-none snap-start">
      <button
        type="button"
        onClick={() => onOpen(place.venue.id)}
        aria-label={t('browse.openPlace', { name })}
        className={cn(
          'group block w-full border bg-white text-left transition-colors duration-200',
          isActive ? 'border-ink' : 'border-ash hover:border-ink',
        )}
      >
        <span className="relative block h-[120px] overflow-hidden bg-parchment">
          <img
            src={place.venue.imageUrl}
            alt=""
            width={264}
            height={120}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span className="absolute top-2 left-2 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink uppercase">
            {t(`categories.${place.venue.category}`)}
          </span>
        </span>
        <span className="block space-y-2 p-3">
          <span className="block truncate text-body font-medium text-ink">{name}</span>
          <span className="flex items-center gap-2 font-mono text-[11px] text-graphite">
            <span>{t('browse.km', { value: place.distanceKm.toFixed(1) })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('browse.minutes', { count: place.travelMinutes })}</span>
          </span>
          <span className="flex items-center gap-3">
            <CrowdMeter
              busynessPct={place.isOpenNow ? place.crowd.busynessPct : 0}
              label={crowdText}
              className="flex-1"
            />
            <span className="flex-none text-caption tracking-normal text-ink">{crowdText}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
