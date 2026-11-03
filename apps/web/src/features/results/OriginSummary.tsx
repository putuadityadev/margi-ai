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
        className={`bg-white rounded-none border border-ash p-5 sm:p-6 animate-pulse ${className}`}
        data-testid="origin-summary-skeleton"
      >
        <div className="h-5 w-1/3 bg-ash/40 rounded-none mb-3" />
        <div className="h-8 w-2/3 bg-ash/30 rounded-none mb-3" />
        <div className="h-16 w-full bg-ash/20 rounded-none" />
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
      className={`bg-white border border-ash/80 p-5 sm:p-6 space-y-4 rounded-none ${className}`}
    >
      {/* Top Row: Simple Label & Status Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-graphite font-medium uppercase tracking-wider">
          <span>{t('originBottleneck', 'Traffic Report')}</span>
          {regencyName ? <span>· {regencyName}</span> : null}
        </div>

        {redZone ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-crowd-high/10 text-crowd-high border border-crowd-high/40 text-[11px] font-medium"
            data-testid="red-zone-pill"
          >
            <span className="w-1.5 h-1.5 rounded-none bg-crowd-high" />
            <span>
              {isId ? 'Sangat Ramai Saat Ini' : 'Very Crowded Right Now'}
            </span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-crowd-low/10 text-crowd-low border border-crowd-low/40 text-[11px] font-medium"
            data-testid="calm-zone-pill"
          >
            <span className="w-1.5 h-1.5 rounded-none bg-crowd-low" />
            <span>
              {isId ? 'Kondisi Tenang Saat Ini' : 'Calm Conditions Right Now'}
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
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-none object-cover border border-ash/80 shrink-0 bg-parchment"
          />
        ) : null}

        <div className="space-y-1.5 min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl text-ink font-medium leading-snug">
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
              <span className="inline-flex items-center gap-1 text-xs text-graphite bg-parchment px-2.5 py-0.5 rounded-none border border-ash/70">
                <ClockIcon size={12} />
                <span>{arrivalDisplay}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {insight ? (
        <p className="text-xs sm:text-sm text-graphite font-normal leading-relaxed">{insight}</p>
      ) : null}

      {/* Structured 3-Box Fact Snapshot matching DecisionCard style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Metric 1: Crowd Level */}
        <div className="p-3 bg-parchment border border-ash/70 rounded-none flex items-center gap-3">
          <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
            <span className={`w-2 h-2 rounded-none ${redZone ? 'bg-crowd-high' : 'bg-crowd-low'}`} />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-graphite uppercase font-medium tracking-wider truncate">
              {isId ? 'Tingkat Ramai' : 'Crowd Level'}
            </span>
            <span className="block text-base sm:text-lg font-medium text-ink tabular-nums">
              {Math.round(bEff)}% · {busynessMeta.name}
            </span>
          </div>
        </div>

        {/* Metric 2: Wait Estimate */}
        <div className="p-3 bg-parchment border border-ash/70 rounded-none flex items-center gap-3">
          <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
            <ClockIcon size={15} />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-graphite uppercase font-medium tracking-wider truncate">
              {isId ? 'Estimasi Antre' : 'Est. Wait'}
            </span>
            <span className="block text-base sm:text-lg font-medium text-ink tabular-nums">
              {formatWaitDuration(queueEstimateMin, isId)}
            </span>
          </div>
        </div>

        {/* Metric 3: Quietest Time */}
        <div className="p-3 bg-parchment border border-ash/70 rounded-none flex items-center gap-3">
          <div className="w-8 h-8 rounded-none border border-ash/80 bg-white flex items-center justify-center shrink-0">
            <ClockIcon size={15} />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-graphite uppercase font-medium tracking-wider truncate">
              {isId ? 'Jam Paling Sepi' : 'Quietest Time'}
            </span>
            <span className="block text-base sm:text-lg font-medium text-ink tabular-nums">
              {quietestHour}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
