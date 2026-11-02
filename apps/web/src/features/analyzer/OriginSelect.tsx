import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { haversineKm, type VenueLite } from '@margi-ai/shared';
import { Select, Button } from '../../components/ui';
import { useOrigins } from '../public/queries';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_VENUES } from '../../mocks/data/venues';

const FALLBACK_ORIGINS: VenueLite[] = MOCK_VENUES.slice(0, 10);

export function OriginSelect(): ReactNode {
  const { i18n, t } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const { data: origins = FALLBACK_ORIGINS } = useOrigins();

  const originVenueId = useAnalyzerStore((s) => s.originVenueId);
  const setOriginVenueId = useAnalyzerStore((s) => s.setOriginVenueId);

  const [locating, setLocating] = useState<boolean>(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const handleUseMyLocation = (): void => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoNotice(t('locationPermissionDenied'));
      return;
    }

    setLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (origins.length === 0) return;

        let nearest = origins[0]!;
        let minDistance = haversineKm(userCoords, { lat: nearest.lat, lng: nearest.lng });

        for (const origin of origins) {
          const dist = haversineKm(userCoords, { lat: origin.lat, lng: origin.lng });
          if (dist < minDistance) {
            minDistance = dist;
            nearest = origin;
          }
        }

        const name = isId ? nearest.nameId : nearest.nameEn;

        if (minDistance <= 5) {
          setOriginVenueId(nearest.id);
          setGeoNotice(t('locationSnapped', { name, distance: minDistance.toFixed(1) }));
        } else {
          setGeoNotice(t('locationOutside', { name, distance: minDistance.toFixed(1) }));
        }
      },
      () => {
        setLocating(false);
        setGeoNotice(t('locationPermissionDenied'));
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label htmlFor="origin-select" className="text-body-sm font-medium text-ink">
          {t('originLabel')}
        </label>
        <Button
          variant="ghost"
          size="sm"
          disabled={locating}
          onClick={handleUseMyLocation}
          className="text-xs text-graphite hover:text-ink h-auto py-1 px-2 self-start sm:self-auto"
        >
          {locating ? t('locating') : `📍 ${t('useMyLocation')}`}
        </Button>
      </div>

      <Select
        id="origin-select"
        value={originVenueId ?? ''}
        onChange={(e) => setOriginVenueId(e.target.value || null)}
        className="w-full"
      >
        <option value="">{t('originPlaceholder')}</option>
        {origins.map((origin) => {
          const name = isId ? origin.nameId : origin.nameEn;
          return (
            <option key={origin.id} value={origin.id}>
              {name} ({origin.category})
            </option>
          );
        })}
      </Select>

      {geoNotice && (
        <p className="text-xs text-graphite font-normal leading-relaxed pt-1">{geoNotice}</p>
      )}
    </div>
  );
}
