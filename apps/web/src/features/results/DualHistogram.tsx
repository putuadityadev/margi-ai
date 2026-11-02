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
  CALM_THRESHOLD,
  RED_ZONE_THRESHOLD,
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
}

function CustomTooltip({ active, payload, originName, altName }: CustomTooltipProps): ReactNode {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="bg-charcoal text-parchment p-3 rounded-inner border border-stone text-xs font-mono"
      data-testid="histogram-tooltip"
    >
      <div className="font-medium text-parchment mb-1.5 flex items-center justify-between gap-4">
        <span>{data.hour} WITA</span>
        {data.isArrival ? (
          <span className="text-[10px] uppercase text-lime border border-lime/40 px-1 py-0.2 rounded-inner">
            Arrival Time
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-stone truncate max-w-[140px]">{originName}:</span>
          <span className="font-medium text-crowd-high tabular-nums">
            {data.originVal}% ({data.originClass})
          </span>
        </div>

        {data.altVal != null ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone truncate max-w-[140px]">{altName}:</span>
            <span className="font-medium text-crowd-low tabular-nums">
              {data.altVal}% ({data.altClass})
            </span>
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
    : t('dualHistogram.originLabel', 'Origin Hotspot');

  const altName = activeCard
    ? isId
      ? activeCard.venue.nameId || activeCard.venue.nameEn
      : activeCard.venue.nameEn || activeCard.venue.nameId
    : t('dualHistogram.altLabel', 'Selected Alternative');

  // Hours range: 06:00 to 22:00 WITA (17 hours)
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

  // Screen reader accessible summary (AC-08.4)
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

    return `Hourly crowd busyness from 06:00 to 22:00 WITA. At arrival hour ${arrivalHour}:00 WITA, ${originArrivalText}, whereas ${altArrivalText}. Calm threshold is at 35%, Red Zone threshold is at 75%.`;
  }, [origin, chartData, arrivalHour, originName, altName]);

  if (!origin) {
    return (
      <section
        aria-label="Hourly Crowd Visualizer"
        className={`bg-white rounded-card border border-ash p-6 md:p-8 min-h-[360px] animate-pulse ${className}`}
        data-testid="dual-histogram-skeleton"
      >
        <div className="h-6 w-1/3 bg-ash/40 rounded-inner mb-4" />
        <div className="h-4 w-2/3 bg-ash/20 rounded-inner mb-6" />
        <div className="h-48 bg-ash/15 rounded-inner w-full" />
      </section>
    );
  }

  const arrivalLabel = `${arrivalHour.toString().padStart(2, '0')}:00`;

  return (
    <section
      aria-label="Dual-Histogram Crowd Visualizer"
      data-testid="dual-histogram"
      className={`bg-white rounded-card border border-ash p-6 md:p-8 transition-colors ${className}`}
    >
      <VisuallyHidden>{srSummary}</VisuallyHidden>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-subheading text-ink font-medium leading-tight">
            {t('dualHistogram.title', 'Hourly Crowd Profile (06:00 – 22:00 WITA)')}
          </h3>
          <p className="text-xs text-graphite font-normal mt-0.5">
            {t(
              'dualHistogram.subtitle',
              'Direct comparison between crowded origin hotspot and recommended alternative',
            )}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: CROWD_COLORS.high }}
              aria-hidden="true"
            />
            <span className="text-ink truncate max-w-[140px]">{originName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: CROWD_COLORS.low }}
              aria-hidden="true"
            />
            <span className="text-ink truncate max-w-[140px]">{altName}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 md:h-80 pt-2" data-testid="histogram-chart-container">
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={260}>
          <BarChart data={chartData} margin={{ top: 16, right: 12, left: -20, bottom: 4 }}>
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={{ stroke: '#d2d2c8' }}
              tick={{ fill: '#6e6e64', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#d2d2c8' }}
              tick={{ fill: '#6e6e64', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
              tickFormatter={(v: number) => `${v}%`}
            />

            <Tooltip content={<CustomTooltip originName={originName} altName={altName} />} />

            {/* Threshold reference lines */}
            <ReferenceLine
              y={CALM_THRESHOLD}
              stroke="#2f9e5b"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Calm ≤35%',
                position: 'insideTopLeft',
                fill: '#2f9e5b',
                fontSize: 10,
                fontFamily: 'Geist Mono, monospace',
              }}
            />
            <ReferenceLine
              y={RED_ZONE_THRESHOLD}
              stroke="#e0442b"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Red Zone ≥75%',
                position: 'insideTopLeft',
                fill: '#e0442b',
                fontSize: 10,
                fontFamily: 'Geist Mono, monospace',
              }}
            />

            {/* Arrival hour vertical indicator */}
            <ReferenceLine
              x={arrivalLabel}
              stroke="#14140f"
              strokeWidth={1.5}
              label={{
                value: 'Arrival',
                position: 'top',
                fill: '#14140f',
                fontSize: 10,
                fontFamily: 'Geist Mono, monospace',
              }}
            />

            {/* Origin Bars */}
            <Bar
              dataKey="originVal"
              name={originName}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion}
              animationDuration={450}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-origin-${entry.hourNum}`}
                  fill={getCrowdColor(entry.originVal, true)}
                />
              ))}
            </Bar>

            {/* Alternative Bars */}
            {activeCard ? (
              <Bar
                dataKey="altVal"
                name={altName}
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={450}
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

      {!activeCard ? (
        <div className="mt-3 text-center text-xs text-graphite font-mono">
          {t(
            'dualHistogram.noAlternativeSelected',
            'Select a route card below to compare hourly curve',
          )}
        </div>
      ) : null}
    </section>
  );
}
