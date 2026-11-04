import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import type { Area, GeoPoint, ReverseGeocode } from '@margi-ai/shared';
import { Spinner } from '../../components/ui';
import type { OriginSource } from '../../stores/exploreStore';
import { ExploreSheet } from './ExploreSheet';
import type { GeolocationStatus } from './useGeolocation';

export type LocateNotice = 'denied' | 'unavailable' | 'outside' | null;

export interface LocateSheetProps {
  readonly origin: GeoPoint | null;
  readonly originSource: OriginSource | null;
  readonly place: ReverseGeocode | undefined;
  readonly areas: readonly Area[];
  readonly gpsStatus: GeolocationStatus;
  readonly notice: LocateNotice;
  readonly onUseGps: () => void;
  readonly onPickArea: (area: Area) => void;
  readonly onConfirm: () => void;
  readonly onChange: () => void;
  readonly onHeightChange: (heightPx: number) => void;
}

const MAX_SEARCH_RESULTS = 5;
/** Beyond this distance from the nearest named area, the label reads "Near <area>". */
const NEAR_LABEL_KM = 2.5;

function regencyName(regencyId: string): string {
  return regencyId.charAt(0).toUpperCase() + regencyId.slice(1);
}

/** Step 1 of the flow: choose and fine-tune the starting point. */
export function LocateSheet(props: LocateSheetProps): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const [query, setQuery] = useState('');
  const searchId = useId();
  const { origin, place, areas, gpsStatus, notice } = props;

  const nameOf = (area: Area): string => (isId ? area.nameId : area.nameEn);
  const popular = areas.filter((area) => area.isPopularStart);
  const needle = query.trim().toLowerCase();
  const results = needle
    ? areas
        .filter((area) => nameOf(area).toLowerCase().includes(needle))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  if (origin) {
    const areaLabel = place
      ? place.distanceKm > NEAR_LABEL_KM
        ? t('locate.near', { area: nameOf(place.area) })
        : nameOf(place.area)
      : '—';
    return (
      <ExploreSheet
        motionKey="locate-confirm"
        label={t('locate.title')}
        onHeightChange={props.onHeightChange}
      >
        <div data-sheet-item className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center border border-ink bg-lime">
            <MapPin size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium text-ink">{areaLabel}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-graphite">
              {place && <span>{regencyName(place.area.regencyId)}</span>}
              <span>
                {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
              </span>
              {props.originSource && (
                <span className="border border-ash px-1 uppercase">
                  {t(`locate.source.${props.originSource}`)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onChange}
            className="flex-none py-1 text-body-sm text-graphite underline underline-offset-4 hover:text-ink"
          >
            {t('locate.change')}
          </button>
        </div>
        <p data-sheet-item className="mt-4 text-body-sm text-graphite">
          {t('locate.adjustHint')}
        </p>
        <button
          data-sheet-item
          type="button"
          onClick={props.onConfirm}
          className="mt-4 h-14 w-full border border-ink bg-lime text-body font-medium text-ink active:scale-[0.99]"
        >
          {t('locate.confirm')}
        </button>
      </ExploreSheet>
    );
  }

  return (
    <ExploreSheet
      motionKey="locate-pick"
      label={t('locate.title')}
      onHeightChange={props.onHeightChange}
    >
      <h1 data-sheet-item className="text-heading font-medium text-ink">
        {t('locate.title')}
      </h1>

      {notice && (
        <p
          data-sheet-item
          role="status"
          className="mt-3 border-l-2 border-ink bg-parchment px-3 py-2 text-body-sm text-ink"
        >
          {t(`locate.${notice}`)}
        </p>
      )}

      <button
        data-sheet-item
        type="button"
        onClick={props.onUseGps}
        disabled={gpsStatus === 'locating'}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 border border-ink bg-lime text-body font-medium text-ink active:scale-[0.99] disabled:opacity-70"
      >
        {gpsStatus === 'locating' ? <Spinner size="sm" /> : <LocateFixed size={18} />}
        {gpsStatus === 'locating' ? t('locate.locating') : t('locate.useGps')}
      </button>

      <p data-sheet-item className="mt-5 text-eyebrow uppercase text-graphite">
        {t('locate.orPick')}
      </p>
      <div data-sheet-item className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
        {popular.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => props.onPickArea(area)}
            className="flex-none border border-ash px-3 py-2 text-body-sm text-ink hover:border-ink"
          >
            {nameOf(area)}
          </button>
        ))}
      </div>

      <div data-sheet-item className="relative mt-3">
        <label htmlFor={searchId} className="sr-only">
          {t('locate.searchLabel')}
        </label>
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-graphite"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('locate.searchPlaceholder')}
          autoComplete="off"
          className="h-12 w-full border border-ash bg-white pr-3 pl-9 text-body text-ink placeholder:text-stone focus:border-ink focus:outline-none"
        />
      </div>
      {needle && (
        <ul className="mt-1 max-h-48 divide-y divide-ash overflow-y-auto border border-ash">
          {results.length === 0 && (
            <li className="px-3 py-3 text-body-sm text-graphite">{t('locate.noMatch')}</li>
          )}
          {results.map((area) => (
            <li key={area.id}>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  props.onPickArea(area);
                }}
                className="flex w-full items-center justify-between px-3 py-3 text-left text-body-sm text-ink hover:bg-parchment"
              >
                <span>{nameOf(area)}</span>
                <span className="font-mono text-[11px] text-graphite">
                  {regencyName(area.regencyId)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ExploreSheet>
  );
}
