import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { googleMapsDirUrl, type MsmeBundleItem as MsmeBundleItemType } from '@margi-ai/shared';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { ExternalArrowIcon, StoreIcon, UtensilsIcon } from '../../components/ui';
import { track } from '../../lib/track';

export interface MsmeBundleItemProps {
  readonly item: MsmeBundleItemType;
  readonly nearVenueName?: string | undefined;
  readonly className?: string;
}

function formatMsmeCategory(category: string, isId: boolean): string {
  switch (category) {
    case 'CULINARY':
      return isId ? 'Warung & Kuliner' : 'Local Warung & Food';
    case 'COFFEE':
      return isId ? 'Kopi & Roastery' : 'Local Coffee';
    case 'CRAFT':
      return isId ? 'Kerajinan Warga' : 'Local Craft';
    case 'VILLAGE':
      return isId ? 'Desa Wisata' : 'Cultural Village';
    default:
      return isId ? 'UMKM Lokal' : 'Local Spot';
  }
}

export function MsmeBundleItem({
  item,
  nearVenueName,
  className = '',
}: MsmeBundleItemProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;
  const venueName = isId
    ? item.venue.nameId || item.venue.nameEn
    : item.venue.nameEn || item.venue.nameId;

  const mapsUrl = googleMapsDirUrl({ lat: item.venue.lat, lng: item.venue.lng });
  const isCulinary = item.venue.category === 'CULINARY' || item.venue.category === 'COFFEE';

  const handleNavigateClick = (): void => {
    track('navigate_clicked', {
      venueId: item.venue.id,
      kind: 'MSME',
    });
  };

  return (
    <div
      className={`p-4 rounded-none bg-parchment border border-ash/80 flex flex-col justify-between gap-3 text-ink ${className}`}
      data-testid="msme-bundle-item"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-graphite">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-white border border-ash text-[11px] font-medium text-ink">
                {isCulinary ? <UtensilsIcon size={12} /> : <StoreIcon size={12} />}
                <span>{formatMsmeCategory(item.venue.category, isId)}</span>
              </span>
              <span className="tabular-nums">+{item.venue.distanceKm.toFixed(1)} km</span>
            </div>
            <h4 className="text-body-sm font-medium text-ink mt-1.5 leading-snug">{venueName}</h4>
            {nearVenueName ? (
              <div className="text-[11px] text-graphite mt-0.5">
                {isId ? `Dekat ${nearVenueName}` : `Near ${nearVenueName}`}
              </div>
            ) : null}
          </div>

          <BusynessBadge
            bEff={item.snapshot.bEff}
            tier={item.snapshot.tier}
            synthetic={item.snapshot.synthetic}
            showTier={false}
          />
        </div>

        <p className="text-xs text-graphite leading-relaxed">{item.pairingReason}</p>
      </div>

      <div className="pt-2.5 border-t border-ash/60 flex items-center justify-end">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-graphite underline underline-offset-4 transition-colors"
          aria-label={`${t('navigateMsme', 'Directions')}: ${venueName}`}
          data-testid="msme-navigate-link"
        >
          <span>{t('navigateMsme', isId ? 'Rute ke UMKM' : 'Directions')}</span>
          <ExternalArrowIcon size={13} />
        </a>
      </div>
    </div>
  );
}
