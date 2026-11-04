import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocateFixed } from 'lucide-react';
import { isInBali } from '@margi-ai/shared';
import { Spinner } from '../../components/ui';
import { useExploreStore } from '../../stores/exploreStore';
import { useAreas } from './queries';
import { useGeolocation } from './useGeolocation';

/**
 * One-tap starting point for screens that need it before the map flow has run (Feed, Chat):
 * the device location or a popular town. It writes the same origin the map uses, so every
 * screen then agrees on where the traveller starts.
 */
export function OriginQuickPick(): ReactNode {
  const { t, i18n } = useTranslation('app');
  const isId = i18n.language.startsWith('id');
  const setOrigin = useExploreStore((state) => state.setOrigin);
  const areas = useAreas();
  const [outside, setOutside] = useState(false);
  const gps = useGeolocation((point) => {
    if (isInBali(point)) {
      setOutside(false);
      setOrigin(point, 'gps');
    } else {
      setOutside(true);
    }
  });

  const popular = (areas.data ?? []).filter((area) => area.isPopularStart).slice(0, 8);
  const notice = outside
    ? t('origin.outside')
    : gps.status === 'denied'
      ? t('origin.denied')
      : gps.status === 'unavailable'
        ? t('origin.unavailable')
        : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={gps.request}
        disabled={gps.status === 'locating'}
        className="flex h-12 w-full items-center justify-center gap-2 border border-ink bg-lime text-body font-medium text-ink disabled:opacity-60"
      >
        {gps.status === 'locating' ? (
          <Spinner size="sm" />
        ) : (
          <LocateFixed size={16} aria-hidden="true" />
        )}
        {gps.status === 'locating' ? t('origin.locating') : t('origin.gps')}
      </button>
      {notice && (
        <p role="status" className="text-body-sm text-graphite">
          {notice}
        </p>
      )}
      {popular.length > 0 && (
        <div role="group" aria-label={t('origin.areasLabel')} className="flex flex-wrap gap-2">
          {popular.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => setOrigin({ lat: area.lat, lng: area.lng }, 'area')}
              className="h-10 border border-ink bg-white px-3 text-body-sm text-ink"
            >
              {isId ? area.nameId : area.nameEn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
