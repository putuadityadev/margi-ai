import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { AnalysisResult, RouteCard } from '@margi-ai/shared';
import { useStreamStore } from '../../stores/streamStore';
import { useReducedMotion } from '../../lib/gsap';
import { VisuallyHidden } from '../../components/ui/VisuallyHidden';
import {
  CROWD_COLORS,
  getCrowdColor,
  getBusynessClassName,
} from '../../components/data/crowdScale';

export interface DualHistogramProps {
  readonly origin?: AnalysisResult['origin'] | null | undefined;
  readonly activeCard?: RouteCard | null | undefined;
  readonly arrivalHour?: number | undefined;
  readonly className?: string | undefined;
}

interface ChartHourData {
  readonly hourNum: number;
  readonly hour: string;
  readonly originVal: number;
  readonly originClass: string;
  readonly altVal: number | null;
  readonly altClass: string | null;
  readonly isArrival: boolean;
}

interface CustomTooltipProps {
  readonly active?: boolean;
  readonly payload?: readonly {
    dataKey?: string;
    value?: number;
    payload?: ChartHourData;
  }[];
  readonly originName: string;
  readonly altName: string;
  readonly isId: boolean;
}

function CustomTooltip({
  active,
  payload,
  originName,
  altName,
  isId,
}: CustomTooltipProps): ReactNode {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="bg-charcoal text-parchment p-3 rounded-inner border border-stone text-xs"
      data-testid="histogram-tooltip"
    >
      <div className="font-medium text-parchment mb-1.5 flex items-center justify-between gap-4">
        <span>{data.hour} WITA</span>
        {data.isArrival ? (
          <span className="text-[10px] text-lime border border-lime/40 px-1.5 py-0.5 rounded-inner">
            {isId ? 'Jam tiba' : 'Arrival'}
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-stone truncate max-w-[140px]">{originName}:</span>
          <span className="font-medium text-parchment tabular-nums">{data.originVal}%</span>
        </div>

        {data.altVal != null ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone truncate max-w-[140px]">{altName}:</span>
            <span className="font-medium text-lime tabular-nums">{data.altVal}%</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DualHistogram({
  origin: propOrigin,
  activeCard: propActiveCard,
  arrivalHour: propArrivalHour,
  className = '',
}: DualHistogramProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');
  const reducedMotion = useReducedMotion();

  const storeOrigin = useStreamStore((s) => s.sections.origin);
  const storeResult = useStreamStore((s) => s.result);
  const storeActiveCardId = useStreamStore((s) => s.activeCardId);

  const origin = propOrigin ?? storeOrigin ?? storeResult?.origin;
  const activeCard = useMemo(() => {
    if (propActiveCard) return propActiveCard;
    if (!storeResult) return null;
    const all = [...storeResult.micro, ...storeResult.regional];
    return all.find((c) => c.venue.id === storeActiveCardId) ?? all[0] ?? null;
  }, [propActiveCard, storeResult, storeActiveCardId]);

  const arrivalHour = useMemo(() => {
    if (propArrivalHour != null) return propArrivalHour;
    if (storeResult?.input.arrivalAt) {
      try {
        return new Date(storeResult.input.arrivalAt).getHours();
      } catch {
        return 13;
      }
    }
    return 13;
  }, [propArrivalHour, storeResult]);

  const originCurve = origin?.snapshot.hourlyCurve;
  const altCurve = activeCard?.snapshot.hourlyCurve;

  const originName = origin
    ? isId
      ? origin.venue.nameId || origin.venue.nameEn
      : origin.venue.nameEn || origin.venue.nameId
    : t('dualHistogram.originLabel', 'Original Spot');

  const altName = activeCard
    ? isId
      ? activeCard.venue.nameId || activeCard.venue.nameEn
      : activeCard.venue.nameEn || activeCard.venue.nameId
    : t('dualHistogram.altLabel', 'Calmer Spot');

  const chartData = useMemo<ChartHourData[]>(() => {
    const oCurve = originCurve ?? [];
    const aCurve = altCurve ?? [];

    return Array.from({ length: 17 }, (_, idx) => {
      const h = idx + 6;
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const originVal = Math.round(oCurve[h] ?? 50);
      const altVal = activeCard ? Math.round(aCurve[h] ?? 20) : null;

      return {
        hourNum: h,
        hour: hourStr,
        originVal,
        originClass: getBusynessClassName(originVal),
        altVal,
        altClass: altVal != null ? getBusynessClassName(altVal) : null,
        isArrival: h === arrivalHour,
      };
    });
  }, [originCurve, altCurve, activeCard, arrivalHour]);

  const srSummary = useMemo(() => {
    if (!origin) return '';
    const arrivalData = chartData.find((d) => d.hourNum === arrivalHour);
    const originArrivalText = arrivalData
      ? `${originName} is ${arrivalData.originVal}% (${arrivalData.originClass})`
      : '';
    const altArrivalText =
      arrivalData && arrivalData.altVal != null
        ? `${altName} is ${arrivalData.altVal}% (${arrivalData.altClass})`
        : '';

    return `Hourly crowd levels from 06:00 to 22:00 WITA. At ${arrivalHour}:00 WITA, ${originArrivalText}${altArrivalText ? `, while ${altArrivalText}` : ''}.`;
  }, [origin, chartData, arrivalHour, originName, altName]);

  if (!origin) {
    return (
      <section
        aria-label="Hourly Crowd Chart"
        className={`bg-white rounded-card border border-ash p-5 sm:p-6 min-h-[260px] animate-pulse ${className}`}
        data-testid="dual-histogram-skeleton"
      >
        <div className="h-5 w-1/3 bg-ash/40 rounded-inner mb-3" />
        <div className="h-44 bg-ash/15 rounded-inner w-full" />
      </section>
    );
  }

  const arrivalLabel = `${arrivalHour.toString().padStart(2, '0')}:00`;

  return (
    <section
      aria-label={isId ? 'Grafik Keramaian per Jam' : 'Hourly Crowd Comparison'}
      data-testid="dual-histogram"
      className={`bg-white rounded-card border border-ash p-5 sm:p-6 transition-colors ${className}`}
    >
      <VisuallyHidden>{srSummary}</VisuallyHidden>

      {/* Header & Clean Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-body font-medium text-ink">
            {t('dualHistogram.title', 'Busy Hours Today')}
          </h3>
          <p className="text-xs text-graphite font-normal mt-0.5">
            {t(
              'dualHistogram.subtitle',
              'Compare crowd levels by hour (06:00 – 22:00 WITA)',
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CROWD_COLORS.high }}
              aria-hidden="true"
            />
            <span className="text-ink truncate max-w-[130px]">{originName}</span>
          </div>

          {activeCard ? (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CROWD_COLORS.low }}
                aria-hidden="true"
              />
              <span className="text-ink truncate max-w-[130px]">{altName}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Compact Mobile-Friendly Chart */}
      <div className="w-full h-56 sm:h-64" data-testid="histogram-chart-container">
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={200}>
          <BarChart data={chartData} margin={{ top: 14, right: 8, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
              axisLine={{ stroke: '#d2d2c8' }}
              tick={{ fill: '#6e6e64', fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6e6e64', fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />

            <Tooltip
              content={
                <CustomTooltip originName={originName} altName={altName} isId={isId} />
              }
            />

            <ReferenceLine
              x={arrivalLabel}
              stroke="#14140f"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: isId ? 'Tiba' : 'Visit',
                position: 'top',
                fill: '#14140f',
                fontSize: 10,
              }}
            />

            <Bar
              dataKey="originVal"
              name={originName}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-origin-${entry.hourNum}`}
                  fill={getCrowdColor(entry.originVal, true)}
                />
              ))}
            </Bar>

            {activeCard ? (
              <Bar
                dataKey="altVal"
                name={altName}
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={400}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-alt-${entry.hourNum}`}
                    fill={
                      entry.altVal != null ? getCrowdColor(entry.altVal, false) : CROWD_COLORS.low
                    }
                  />
                ))}
              </Bar>
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
