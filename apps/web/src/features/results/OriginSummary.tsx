import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '@margi-ai/shared';
import { BusynessBadge } from '../../components/data/BusynessBadge';
import { useStreamStore } from '../../stores/streamStore';
import { useRegencies } from '../public/queries';

export interface OriginSummaryProps {
  readonly origin?: AnalysisResult['origin'] | null;
  readonly insight?: string;
  readonly arrivalAt?: string;
  readonly simulate?: boolean;
  readonly className?: string;
}

export function OriginSummary({
  origin: propOrigin,
  insight: propInsight,
  arrivalAt: propArrivalAt,
  simulate: propSimulate,
  className = '',
}: OriginSummaryProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');
  const { data: regencies } = useRegencies();
  const storeOrigin = useStreamStore((s) => s.sections.origin);
  const storeResult = useStreamStore((s) => s.result);

  const origin = propOrigin ?? storeOrigin ?? storeResult?.origin;
  const insight = propInsight ?? storeResult?.insight;
  const arrivalAt = propArrivalAt ?? storeResult?.input.arrivalAt;
  const simulate = propSimulate ?? storeResult?.simulate ?? false;

  if (!origin) {
    return (
      <section
        aria-label="Origin Hotspot Summary"
        className={`bg-white rounded-card border border-ash p-6 md:p-8 animate-pulse ${className}`}
        data-testid="origin-summary-skeleton"
      >
        <div className="h-6 w-1/3 bg-ash/40 rounded-inner mb-4" />
        <div className="h-10 w-2/3 bg-ash/30 rounded-inner mb-2" />
        <div className="h-4 w-1/2 bg-ash/20 rounded-inner" />
      </section>
    );
  }

  const { venue, snapshot, cfs, redZone, queueEstimateMin } = origin;
  const venueName = isId ? venue.nameId || venue.nameEn : venue.nameEn || venue.nameId;
  const regency = regencies?.find((r) => r.id === venue.regencyId);
  const regencyName = regency ? (isId ? regency.nameId : regency.nameEn) : null;
  const bEff = snapshot.bEff;

  // Formatting hours from arrivalAt if available
  let arrivalDisplay = '';
  if (arrivalAt) {
    try {
      const d = new Date(arrivalAt);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      arrivalDisplay = `${h}:${m} WITA`;
    } catch {
      arrivalDisplay = '';
    }
  }

  return (
    <section
      aria-label="Origin Hotspot Summary"
      data-testid="origin-summary"
      className={`bg-white rounded-card border border-ash p-6 md:p-8 transition-colors ${className}`}
    >
      {/* Eyebrow & Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-caption uppercase tracking-wider text-graphite font-normal">
          <span>{t('originBottleneck', 'Origin Hotspot Bottleneck')}</span>
          {regencyName ? <span>· {regencyName}</span> : null}
        </div>

        {redZone ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-crowd-high/15 text-crowd-high border border-crowd-high/30 text-xs font-medium"
            data-testid="red-zone-pill"
          >
            <span className="w-2 h-2 rounded-full bg-crowd-high animate-pulse" />
            Red Zone — Reroute recommended
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-crowd-low/15 text-crowd-low border border-crowd-low/30 text-xs font-medium"
            data-testid="calm-zone-pill"
          >
            <span className="w-2 h-2 rounded-full bg-crowd-low" />
            Normal Traffic — Moderate crowd
          </span>
        )}
      </div>

      {/* Main Title & Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Venue Details */}
        <div className="md:col-span-8">
          <h2 className="text-heading text-ink font-medium leading-tight">{venueName}</h2>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <BusynessBadge
              bEff={bEff}
              tier={snapshot.tier}
              synthetic={snapshot.synthetic || simulate}
            />

            {arrivalDisplay ? (
              <span className="text-xs text-graphite font-mono bg-parchment px-2.5 py-1 rounded-inner border border-ash">
                Target: {arrivalDisplay}
              </span>
            ) : null}

            <span className="text-xs text-graphite font-normal">
              Estimated wait:{' '}
              <strong className="text-ink font-medium font-mono tabular-nums">
                ~{queueEstimateMin} min
              </strong>
            </span>
          </div>

          {/* Insight sentence */}
          {insight ? (
            <p className="mt-4 text-body-sm text-graphite font-normal leading-relaxed">{insight}</p>
          ) : null}
        </div>

        {/* Right Column: Large CFS Metric */}
        <div className="md:col-span-4 flex flex-col md:items-end justify-center p-4 rounded-inner bg-parchment border border-ash/80">
          <span className="text-[10px] uppercase tracking-wider text-graphite font-medium">
            Friction Score (CFS)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-4xl md:text-5xl font-mono font-medium tabular-nums ${
                redZone ? 'text-crowd-high' : 'text-crowd-low'
              }`}
              data-testid="cfs-value"
            >
              {Math.round(cfs)}
            </span>
            <span className="text-sm font-mono text-stone">/100</span>
          </div>
          <span className="text-[11px] text-graphite font-normal mt-1">
            {redZone ? 'Critical queue pressure' : 'Manageable congestion'}
          </span>
        </div>
      </div>
    </section>
  );
}
