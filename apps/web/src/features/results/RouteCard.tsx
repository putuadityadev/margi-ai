import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { ClockIcon, ExternalArrowIcon, MapPinIcon } from '../../components/ui';
import { ImpactBadges } from './ImpactBadges';
import { Etiquette } from './Etiquette';
import { track } from '../../lib/track';

export interface RouteCardProps {
  readonly card: RouteCardType;
  readonly isActive?: boolean | undefined;
  readonly onSelect?: ((venueId: string) => void) | undefined;
  readonly className?: string | undefined;
}

export function RouteCard({
  card,
  isActive = false,
  onSelect,
  className = '',
}: RouteCardProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;

  const venueName = isId
    ? card.venue.nameId || card.venue.nameEn
    : card.venue.nameEn || card.venue.nameId;

  const regencyName = isId
    ? card.venue.regency?.nameId || card.venue.regency?.nameEn || card.venue.regencyId
    : card.venue.regency?.nameEn || card.venue.regency?.nameId || card.venue.regencyId;

  const hasFiredViewRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasFiredViewRef.current) {
      hasFiredViewRef.current = true;
      track('recommendation_viewed', {
        venueId: card.venue.id,
        rank: card.rank,
        fiscalBoost: card.fiscalBoost,
      });
    }
  }, [card.venue.id, card.rank, card.fiscalBoost]);

  const handleNavigateClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    track('navigate_clicked', {
      venueId: card.venue.id,
      kind: 'DTW',
    });
  };

  const handleCardClick = (): void => {
    if (onSelect) {
      onSelect(card.venue.id);
    }
  };

  return (
    <article
      tabIndex={0}
      role="region"
      aria-label={venueName}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`rounded-card bg-white border transition-colors cursor-pointer p-4 sm:p-6 text-ink space-y-4 focus-visible:outline-none focus-visible:border-ink ${
        isActive ? 'border-2 border-ink' : 'border-ash hover:border-graphite'
      } ${className}`}
      data-testid={`route-card-${card.venue.id}`}
      data-active={isActive ? 'true' : 'false'}
    >
      {/* 1. Visual Header + Core Place Info */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="relative w-full sm:w-44 aspect-[16/10] sm:aspect-auto sm:h-36 shrink-0 rounded-inner overflow-hidden bg-parchment border border-ash/60">
          <img
            src={card.venue.imageUrl}
            alt={venueName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {card.venue.imageCredit ? (
            <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-charcoal/80 text-parchment text-[9px]">
              {card.venue.imageCredit}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0 space-y-2.5 w-full">
          <div className="flex items-start justify-between gap-2.5 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-graphite">
                <span className="font-medium text-ink">{regencyName}</span>
                <span>·</span>
                <span>
                  ~{card.venue.distanceKm.toFixed(1)} km (~{card.venue.travelMinEstimate}{' '}
                  {isId ? 'mnt' : 'min'})
                </span>
              </div>
              <h3 className="text-subheading font-medium text-ink mt-0.5 leading-snug">
                {venueName}
              </h3>
            </div>

            <BusynessBadge
              bEff={card.snapshot.bEff}
              tier={card.snapshot.tier}
              synthetic={card.snapshot.synthetic}
              showTier={false}
            />
          </div>

          {/* Human Benefit Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-lime/35 text-ink border border-ink/20 text-xs font-medium tabular-nums">
              {Math.round(card.simVibe)}% {t('vibeSimilarity', isId ? 'suasana mirip' : 'similar vibe')}
            </span>

            <ImpactBadges
              timeSavedMin={card.impact.timeSavedMin}
              fiscalBoost={card.fiscalBoost}
              supportsMsmeCount={card.impact.supportsMsmeCount}
            />
          </div>

          <p className="text-body-sm text-graphite leading-relaxed">{card.whyItMatches}</p>
        </div>
      </div>

      {/* 2. Best Time Tip & Cultural Etiquette */}
      <div className="flex items-center gap-2 text-xs text-graphite bg-parchment/70 px-3.5 py-2.5 rounded-inner border border-ash/70">
        <ClockIcon size={14} className="text-ink" />
        <span>
          <strong className="font-medium text-ink">
            {t('bestTime', isId ? 'Waktu nyaman' : 'Best time')}:
          </strong>{' '}
          {card.bestTimeTip}
        </span>
      </div>

      <Etiquette items={card.etiquette} category={card.venue.category} />

      {/* 3. Clean Card Footer: Map Highlight Indicator + Google Maps Action */}
      <div className="pt-3 border-t border-ash/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-graphite">
          <MapPinIcon size={14} className={isActive ? 'text-ink' : 'text-stone'} />
          <span className={isActive ? 'text-ink' : 'text-graphite'}>
            {isActive
              ? isId
                ? 'Ditampilkan pada peta & daftar UMKM di bawah'
                : 'Shown on map & nearby spots below'
              : isId
                ? 'Ketuk untuk lihat di peta & UMKM sekitar'
                : 'Tap to view on map & nearby spots'}
          </span>
        </span>

        <a
          href={card.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-inner bg-ink text-parchment hover:bg-charcoal text-xs font-medium transition-colors cursor-pointer"
          aria-label={`${t('navigateDtw', 'Open in Google Maps')}: ${venueName}`}
          data-testid="dtw-navigate-link"
        >
          <span>{t('navigateDtw', 'Open in Google Maps')}</span>
          <ExternalArrowIcon size={14} />
        </a>
      </div>
    </article>
  );
}
