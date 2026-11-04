import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import type { GeoPoint } from '@margi-ai/shared';
import { CrowdDot } from '../../components/data/CrowdDot';
import { placeName } from '../explore/placeText';
import { usePlaceSearch } from './queries';

export interface StopSearchProps {
  readonly near: GeoPoint;
  readonly excludeIds: readonly string[];
  readonly disabled: boolean;
  readonly onAdd: (venueId: string) => void;
  readonly autoFocus?: boolean;
}

/** Search box that adds a place to the itinerary. */
export function StopSearch({
  near,
  excludeIds,
  disabled,
  onAdd,
  autoFocus,
}: StopSearchProps): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const [query, setQuery] = useState('');
  const inputId = useId();
  const search = usePlaceSearch(query, near);
  const results = (search.data ?? []).filter((place) => !excludeIds.includes(place.venue.id));
  const hasQuery = query.trim().length >= 2;

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {t('timeline.searchLabel')}
      </label>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-graphite"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={disabled ? t('timeline.full') : t('timeline.searchPlaceholder')}
          autoComplete="off"
          className="h-12 w-full border border-ash bg-white pr-3 pl-9 text-body text-ink placeholder:text-stone focus:border-ink focus:outline-none disabled:bg-parchment"
        />
      </div>
      {hasQuery && !disabled && search.isError && (
        <p role="alert" className="mt-1 border border-ink px-3 py-2 text-body-sm text-ink">
          {t('timeline.searchError')}
        </p>
      )}
      {hasQuery && !disabled && !search.isError && (
        <ul className="mt-1 max-h-60 divide-y divide-ash overflow-y-auto border border-ash">
          {results.length === 0 && !search.isFetching && (
            <li className="px-3 py-3 text-body-sm text-graphite">{t('timeline.noResults')}</li>
          )}
          {results.map((place) => {
            const name = placeName(place.venue, isId);
            return (
              <li key={place.venue.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    onAdd(place.venue.id);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-parchment"
                >
                  {place.venue.kind !== 'OTHER' && (
                    <CrowdDot busynessPct={place.crowd.busynessPct} isOpen={place.isOpenNow} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium text-ink">{name}</span>
                    <span className="font-mono text-[11px] text-graphite">
                      {tExplore(`categories.${place.venue.category}`)} ·{' '}
                      {tExplore('browse.km', { value: place.distanceKm.toFixed(1) })}
                    </span>
                  </span>
                  <Plus size={16} className="flex-none text-ink" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
