import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '@margi-ai/shared';
import { BusynessBadge, getBusynessLabel } from '../../components/data/BusynessBadge';
import { ClockIcon } from '../../components/ui';
import { useStreamStore } from '../../stores/streamStore';
import { useRegencies } from '../public/queries';

export interface OriginSummaryProps {
  readonly origin?: AnalysisResult['origin'] | null | undefined;
  readonly insight?: string | undefined;
  readonly arrivalAt?: string | undefined;
  readonly simulate?: boolean | undefined;
  readonly className?: string | undefined;
}

function formatWaitDuration(minutes: number, isId: boolean): string {
  if (minutes < 60) {
    return isId ? `~${minutes} mnt` : `~${minutes} min`;
  }
  const hrs = (minutes / 60).toFixed(1).replace(/\.0$/, '');
  return isId ? `~${hrs.replace('.', ',')} jam` : `~${hrs} hrs`;
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

  const quietestHour = useMemo(() => {
    const curve = origin?.snapshot.hourlyCurve;
    if (!curve || curve.length < 18) return '07:00 WITA';
    let bestH = 7;
    let minVal = curve[7] ?? 100;
    for (let h = 6; h <= 17; h += 1) {
      const val = curve[h] ?? 100;
      if (val < minVal) {
        minVal = val;
        bestH = h;
      }
    }
    return `${String(bestH).padStart(2, '0')}:00 WITA`;
  }, [origin?.snapshot.hourlyCurve]);

  if (!origin) {
    return (
      <section
        aria-label={isId ? 'Laporan Keramaian' : 'Traffic Report'}
        className={`bg-white rounded-card border border-ash p-5 sm:p-6 animate-pulse ${className}`}
        data-testid="origin-summary-skeleton"
      >
        <div className="h-5 w-1/3 bg-ash/40 rounded-inner mb-3" />
        <div className="h-8 w-2/3 bg-ash/30 rounded-inner mb-3" />
        <div className="h-16 w-full bg-ash/20 rounded-inner" />
      </section>
    );
  }

  const { venue, snapshot, redZone, queueEstimateMin } = origin;
  const venueName = isId ? venue.nameId || venue.nameEn : venue.nameEn || venue.nameId;
  const regency = regencies?.find((r) => r.id === venue.regencyId);
  const regencyName = regency ? (isId ? regency.nameId : regency.nameEn) : null;
  const bEff = snapshot.bEff;
  const busynessMeta = getBusynessLabel(bEff, isId);

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
      aria-label={isId ? 'Laporan Keramaian' : 'Traffic Report'}
      data-testid="origin-summary"
      className={`bg-white rounded-card border border-ash p-5 sm:p-7 space-y-5 ${className}`}
    >
      {/* Top Row: Simple Label & Human Traffic Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-graphite font-medium">
          <span>{t('originBottleneck', 'Traffic Report')}</span>
          {regencyName ? <span>· {regencyName}</span> : null}
        </div>

        {redZone ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-crowd-high/15 text-crowd-high border border-crowd-high/30 text-xs font-medium"
            data-testid="red-zone-pill"
          >
            <span className="w-2 h-2 rounded-full bg-crowd-high animate-pulse" />
            <span>
              {isId ? 'Sedang Sangat Ramai' : 'Very Crowded Right Now'}
            </span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-crowd-low/15 text-crowd-low border border-crowd-low/30 text-xs font-medium"
            data-testid="calm-zone-pill"
          >
            <span className="w-2 h-2 rounded-full bg-crowd-low" />
            <span>
              {isId ? 'Kondisi Cukup Tenang' : 'Comfortable Crowd Level'}
            </span>
          </span>
        )}
      </div>

      {/* Place Header with Photo & Plain Summary */}
      <div className="flex items-start gap-4">
        {venue.imageUrl ? (
          <img
            src={venue.imageUrl}
            alt={venueName}
            width={88}
            height={88}
            className="h-20 w-20 sm:h-22 sm:w-22 rounded-inner object-cover border border-ash shrink-0 bg-parchment"
          />
        ) : null}

        <div className="space-y-2 min-w-0 flex-1">
          <h2 className="text-subheading sm:text-heading text-ink font-medium leading-tight">
            {venueName}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <BusynessBadge
              bEff={bEff}
              tier={snapshot.tier}
              synthetic={snapshot.synthetic || simulate}
              showTier={simulate}
            />
            {arrivalDisplay ? (
              <span className="inline-flex items-center gap-1 text-xs text-graphite bg-parchment px-2.5 py-1 rounded-pill border border-ash">
                <ClockIcon size={13} />
                <span>{arrivalDisplay}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {insight ? (
        <p className="text-body-sm text-graphite font-normal leading-relaxed">{insight}</p>
      ) : null}

      {/* Simple 3-Box Traffic Snapshot */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
        <div className="rounded-inner bg-parchment border border-ash/80 p-3 sm:p-3.5">
          <div className="text-[11px] text-graphite">
            {isId ? 'Tingkat Ramai' : 'Crowd Level'}
          </div>
          <div
            className={`text-xl sm:text-2xl font-medium tabular-nums mt-0.5 ${
              redZone ? 'text-crowd-high' : 'text-crowd-low'
            }`}
          >
            {Math.round(bEff)}%
          </div>
          <div className="text-[11px] text-graphite truncate">{busynessMeta.name}</div>
        </div>

        <div className="rounded-inner bg-parchment border border-ash/80 p-3 sm:p-3.5">
          <div className="text-[11px] text-graphite">
            {isId ? 'Perkiraan Antre' : 'Est. Wait'}
          </div>
          <div className="text-xl sm:text-2xl font-medium text-ink tabular-nums mt-0.5">
            {formatWaitDuration(queueEstimateMin, isId)}
          </div>
          <div className="text-[11px] text-graphite truncate">
            {redZone
              ? isId
                ? 'Antrean panjang'
                : 'Long queue'
              : isId
                ? 'Lancar'
                : 'Short wait'}
          </div>
        </div>

        <div className="rounded-inner bg-parchment border border-ash/80 p-3 sm:p-3.5">
          <div className="text-[11px] text-graphite">
            {isId ? 'Jam Paling Sepi' : 'Quietest Time'}
          </div>
          <div className="text-base sm:text-xl font-medium text-ink tabular-nums mt-1">
            {quietestHour.replace(' WITA', '')}
          </div>
          <div className="text-[11px] text-graphite">WITA</div>
        </div>
      </div>
    </section>
  );
}
