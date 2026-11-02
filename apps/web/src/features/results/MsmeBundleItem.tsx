import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { googleMapsDirUrl, type MsmeBundleItem as MsmeBundleItemType } from '@margi-ai/shared';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { track } from '../../lib/track';

export interface MsmeBundleItemProps {
  readonly item: MsmeBundleItemType;
  readonly className?: string;
}

export function MsmeBundleItem({ item, className = '' }: MsmeBundleItemProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;
  const venueName = isId
    ? item.venue.nameId || item.venue.nameEn
    : item.venue.nameEn || item.venue.nameId;

  const mapsUrl = googleMapsDirUrl({ lat: item.venue.lat, lng: item.venue.lng });

  const handleNavigateClick = (): void => {
    track('navigate_clicked', {
      venueId: item.venue.id,
      kind: 'MSME',
    });
  };

  return (
    <div
      className={`p-3.5 rounded-inner bg-parchment border border-ash/80 flex flex-col justify-between gap-3 text-ink ${className}`}
      data-testid="msme-bundle-item"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-pill bg-ash/60 text-graphite font-medium">
                {item.venue.category}
              </span>
              <span className="text-xs font-mono text-stone">
                +{item.venue.distanceKm.toFixed(1)} km
              </span>
            </div>
            <h4 className="text-sm font-medium text-ink mt-1 leading-snug">{venueName}</h4>
          </div>

          <BusynessBadge
            bEff={item.snapshot.bEff}
            tier={item.snapshot.tier}
            synthetic={item.snapshot.synthetic}
          />
        </div>

        <p className="text-xs text-graphite leading-relaxed italic">
          &ldquo;{item.pairingReason}&rdquo;
        </p>
      </div>

      <div className="pt-2 border-t border-ash/50 flex items-center justify-end">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-stone underline decoration-dotted transition-colors"
          aria-label={`${t('navigateMsme', 'Navigate to MSME')}: ${venueName} (opens Google Maps)`}
          data-testid="msme-navigate-link"
        >
          <span>{t('navigateMsme', 'Navigate to MSME')}</span>
          <span aria-hidden="true" className="text-[11px]">↗</span>
        </a>
      </div>
    </div>
  );
}
