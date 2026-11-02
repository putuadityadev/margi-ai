import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { ImpactBadges } from './ImpactBadges';
import { Etiquette } from './Etiquette';
import { ScoreExplainer } from './ScoreExplainer';
import { MsmeBundleItem } from './MsmeBundleItem';
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
      aria-label={`${venueName} recommendation card`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`rounded-card bg-white border transition-colors cursor-pointer p-5 sm:p-6 text-ink space-y-5 focus-visible:outline-none focus-visible:border-ink ${
        isActive ? 'border-ink ring-2 ring-ink/10' : 'border-ash hover:border-graphite'
      } ${className}`}
      data-testid={`route-card-${card.venue.id}`}
      data-active={isActive ? 'true' : 'false'}
    >
      {/* 1. Header with Photo, Venue Details, Busyness & Match Score */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Photo */}
        <div className="relative w-full md:w-48 h-40 shrink-0 rounded-inner overflow-hidden bg-ash">
          <img
            src={card.venue.imageUrl}
            alt={venueName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {card.venue.imageCredit ? (
            <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-charcoal/80 text-parchment text-[9px] font-mono">
              © {card.venue.imageCredit}
            </span>
          ) : null}
        </div>

        {/* Info & Metrics */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-graphite font-mono">
                <span className="font-medium text-ink">{regencyName}</span>
                <span>•</span>
                <span>
                  ~{card.venue.distanceKm.toFixed(1)} km (~{card.venue.travelMinEstimate} min{' '}
                  {t('estimate', 'estimate')})
                </span>
              </div>
              <h3 className="text-xl font-medium text-ink mt-0.5 leading-snug">{venueName}</h3>
            </div>

            <BusynessBadge
              bEff={card.snapshot.bEff}
              tier={card.snapshot.tier}
              synthetic={card.snapshot.synthetic}
            />
          </div>

          {/* Vibe Match % Large display (40px) */}
          <div className="flex items-baseline gap-3 flex-wrap pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[40px] leading-none font-medium tabular-nums text-ink">
                {Math.round(card.simVibe)}%
              </span>
              <span className="text-xs uppercase font-mono tracking-wider text-graphite font-medium">
                {t('vibeSimilarity', 'Vibe Match')}
              </span>
            </div>

            {/* Top matching dimensions */}
            {card.topMatchingDimensions.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-stone">
                  {t('topMatching', 'Top matches')}:
                </span>
                {card.topMatchingDimensions.map((dim) => (
                  <span
                    key={dim}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-pill bg-parchment text-ink border border-ash"
                  >
                    {dim}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Impact Badges (Time saved, Fiscal boost, MSME support) */}
          <ImpactBadges
            timeSavedMin={card.impact.timeSavedMin}
            fiscalBoost={card.fiscalBoost}
            supportsMsmeCount={card.impact.supportsMsmeCount}
          />
        </div>
      </div>

      {/* Relaxed Match Callout if present */}
      {card.relaxed ? (
        <div
          className="p-3 rounded-inner bg-[#f9f7e8] border border-[#ecd58e] text-xs text-ink space-y-1"
          data-testid="relaxed-match-badge"
        >
          <div className="font-medium text-[#7a5500] uppercase tracking-wider text-[11px]">
            ⚠️ {t('relaxedBadge', 'Relaxed Match')} (Tier {card.relaxed.step})
          </div>
          <p className="text-graphite">{card.relaxed.reasons.join(' · ')}</p>
        </div>
      ) : null}

      {/* 2. Why It Matches & Best Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
        <div className="p-3.5 rounded-inner bg-parchment text-ink space-y-1">
          <div className="font-medium text-graphite uppercase tracking-wider text-[10px]">
            Why It Matches
          </div>
          <p className="text-ink">{card.whyItMatches}</p>
        </div>

        <div className="p-3.5 rounded-inner bg-parchment text-ink space-y-1">
          <div className="font-medium text-graphite uppercase tracking-wider text-[10px]">
            💡 {t('bestTime', 'Best Visit Tip')}
          </div>
          <p className="text-ink">{card.bestTimeTip}</p>
        </div>
      </div>

      {/* 3. Balinese Cultural Etiquette */}
      <Etiquette items={card.etiquette} category={card.venue.category} />

      {/* 4. MSME Bundle Items */}
      {card.msme.length > 0 ? (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">
              {t('msmeBundle', 'Recommended Local MSMEs')}
            </span>
            <span className="text-xs font-mono text-stone">({card.msme.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {card.msme.map((item) => (
              <MsmeBundleItem key={item.venue.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {/* 5. Score Explainer & Navigate Action */}
      <div className="pt-3 border-t border-ash flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <ScoreExplainer
          simVibe={card.simVibe}
          cfs={card.cfs}
          fiscalBoost={card.fiscalBoost}
          serverRank={card.rank}
        />

        <a
          href={card.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-inner bg-ink text-parchment hover:bg-charcoal text-xs font-medium font-sans transition-colors cursor-pointer"
          aria-label={`${t('navigateDtw', 'Navigate in Google Maps')}: ${venueName}`}
          data-testid="dtw-navigate-link"
        >
          <span>{t('navigateDtw', 'Navigate in Google Maps')}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
