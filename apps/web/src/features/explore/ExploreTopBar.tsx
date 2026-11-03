import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { MapPin, RotateCw } from 'lucide-react';

export interface ExploreTopBarProps {
  /** Starting point label; hidden before a point is chosen. */
  readonly locationLabel: string | null;
  readonly onChangeLocation: () => void;
  readonly onRescan: (() => void) | null;
}

/** Floating top bar: home, starting point chip, language, rescan. Map attribution sits beneath. */
export function ExploreTopBar({
  locationLabel,
  onChangeLocation,
  onRescan,
}: ExploreTopBarProps): ReactNode {
  const { t, i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label={t('nav.home')}
          className="pointer-events-auto flex h-11 flex-none items-center gap-2 border border-ink bg-white px-3"
        >
          <span className="h-3 w-3 border border-ink bg-lime" aria-hidden="true" />
          <span className="hidden text-body-sm font-medium tracking-[0.08em] text-ink sm:inline">
            MARGI
          </span>
        </Link>

        {locationLabel !== null && (
          <button
            type="button"
            onClick={onChangeLocation}
            aria-label={t('browse.changeLocation')}
            className="pointer-events-auto flex h-11 min-w-0 items-center gap-2 border border-ink bg-white px-3 text-body-sm text-ink"
          >
            <MapPin size={15} className="flex-none" />
            <span className="truncate">{locationLabel}</span>
          </button>
        )}

        <div className="ml-auto flex flex-none gap-2">
          {onRescan && (
            <button
              type="button"
              onClick={onRescan}
              aria-label={t('browse.rescan')}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-ink bg-white text-ink"
            >
              <RotateCw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isId ? 'en' : 'id')}
            aria-label={t('nav.language')}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-ink bg-white font-mono text-caption tracking-normal text-ink"
          >
            {isId ? 'EN' : 'ID'}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-right text-[9px] text-graphite">
        <span className="pointer-events-auto bg-white/80 px-1">
          {t('map.attribution')} ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>
        </span>
      </p>
    </header>
  );
}
