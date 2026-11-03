import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Minus, Plus, TriangleAlert, X } from 'lucide-react';
import { MAX_TRIP_STOPS, toWita, type DepartureScan, type TripPlan } from '@margi-ai/shared';
import { CrowdDot } from '../../components/data/CrowdDot';
import { DepartureChart } from '../../components/data/DepartureChart';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { CrowdMeter } from '../../components/data/CrowdMeter';
import { cn } from '../../lib/cn';
import type { TripDraft } from '../../stores/tripStore';
import { crowdLevelKey, placeName } from '../explore/placeText';
import { StopSearch } from './StopSearch';
import { clockLabel, dayOf } from './tripText';

export interface TripPlanPanelProps {
  readonly draft: TripDraft;
  readonly plan: TripPlan | undefined;
  /** Crowd on arrival per departure slot; drives the departure chart. */
  readonly departures: DepartureScan | undefined;
  readonly onDepartAt: (departAt: string) => void;
  readonly onAddStop: (venueId: string) => void;
  readonly onRemoveStop: (index: number) => void;
  readonly onMoveStop: (index: number, direction: -1 | 1) => void;
}

const DEPART_STEP_MINUTES = 15;

function shiftIso(iso: string, minutes: number): string {
  return toWita(iso).plus({ minutes }).toISO() ?? iso;
}

function DepartureControl({
  departAt,
  onChange,
}: {
  readonly departAt: string;
  readonly onChange: (iso: string) => void;
}) {
  const { t, i18n } = useTranslation('trip');
  const isId = i18n.language.startsWith('id');
  const day = dayOf(departAt);
  const toDay = (target: 'today' | 'tomorrow'): void => {
    if (target !== day) onChange(shiftIso(departAt, target === 'tomorrow' ? 1440 : -1440));
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-eyebrow text-graphite uppercase">{t('depart.label')}</p>
        <div className="mt-1 flex border border-ink" role="group" aria-label={t('depart.label')}>
          {(['today', 'tomorrow'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={day === option}
              onClick={() => toDay(option)}
              className={cn(
                'h-8 px-2.5 text-body-sm',
                day === option ? 'bg-ink text-white' : 'bg-white text-ink',
              )}
            >
              {t(`depart.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onChange(shiftIso(departAt, -DEPART_STEP_MINUTES))}
          aria-label={t('depart.earlier')}
          className="flex h-11 w-11 items-center justify-center border border-ink bg-white text-ink"
        >
          <Minus size={16} />
        </button>
        <output className="flex h-11 min-w-[96px] items-center justify-center border-y border-ink bg-lime px-2 font-mono text-[26px] tracking-[-0.04em] text-ink tabular-nums">
          {clockLabel(departAt, isId)}
        </output>
        <button
          type="button"
          onClick={() => onChange(shiftIso(departAt, DEPART_STEP_MINUTES))}
          aria-label={t('depart.later')}
          className="flex h-11 w-11 items-center justify-center border border-ink bg-white text-ink"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function MetricsStrip({ plan }: { readonly plan: TripPlan }) {
  const { t, i18n } = useTranslation('trip');
  const isId = i18n.language.startsWith('id');
  const { metrics } = plan;
  return (
    <div className="mt-4 grid grid-cols-4 border border-ink">
      <div className="border-r border-ash p-2.5">
        <p className="text-[10px] leading-tight text-graphite">{t('metrics.travel')}</p>
        <p className="mt-1 font-mono text-[18px] leading-none text-ink tabular-nums">
          <AnimatedNumber value={metrics.totalTravelMinutes + metrics.totalDelayMinutes} />
          <span className="text-[11px]">m</span>
        </p>
      </div>
      <div className="col-span-2 border-r border-ash p-2.5">
        <p className="text-[10px] leading-tight text-graphite">{t('metrics.crowd')}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-mono text-[18px] leading-none text-ink">
            <AnimatedNumber value={metrics.crowdExposure} flashOnDecrease className="px-0.5" />
          </p>
          <CrowdMeter
            busynessPct={metrics.crowdExposure}
            label={`${t('metrics.crowd')} ${metrics.crowdExposure}`}
          />
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[10px] leading-tight text-graphite">{t('metrics.redZones')}</p>
        <p
          className={cn(
            'mt-1 font-mono text-[18px] leading-none tabular-nums',
            metrics.redZoneStops > 0 ? 'text-ink' : 'text-graphite',
          )}
        >
          <AnimatedNumber value={metrics.redZoneStops} flashOnDecrease />
        </p>
      </div>
      <p className="col-span-4 border-t border-ash px-2.5 py-1.5 font-mono text-[11px] text-graphite">
        {t('metrics.endAt', { time: clockLabel(metrics.endAt, isId) })} · {t('metrics.local')}{' '}
        {metrics.msmeStops} · {t('metrics.recipient', { count: metrics.recipientRegencyStops })}
      </p>
    </div>
  );
}

/** "Plan" tab: departure time, trip score, and the editable itinerary. */
export function TripPlanPanel({
  draft,
  plan,
  departures,
  onDepartAt,
  onAddStop,
  onRemoveStop,
  onMoveStop,
}: TripPlanPanelProps): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const isFull = draft.stops.length >= MAX_TRIP_STOPS;
  const stops = plan?.stops ?? [];

  return (
    <div className="px-5 pt-4 pb-6">
      <DepartureControl departAt={draft.departAt} onChange={onDepartAt} />
      {departures && departures.options.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-eyebrow text-graphite uppercase">{t('departures.label')}</p>
          <DepartureChart
            options={departures.options}
            bestIndex={departures.bestIndex}
            selectedDepartAt={draft.departAt}
            onSelect={onDepartAt}
            label={t('departures.label')}
            bestLabel={t('departures.best')}
            timeLabel={(iso) => clockLabel(iso, isId)}
            barLabel={(option) =>
              option.closedStops > 0
                ? `${clockLabel(option.departAt, isId)}: ${t('departures.closed')}`
                : t('departures.pick', {
                    time: clockLabel(option.departAt, isId),
                    value: option.crowdExposure,
                  })
            }
          />
        </div>
      )}
      {plan && <MetricsStrip plan={plan} />}

      {draft.stops.length === 0 && (
        <div className="mt-5">
          <p className="text-subheading font-medium text-ink">{t('timeline.emptyTitle')}</p>
          <p className="mt-1 text-body-sm text-graphite">{t('timeline.empty')}</p>
        </div>
      )}

      <ol className="relative mt-5">
        <li className="flex items-center gap-3 pb-4">
          <span className="h-4 w-4 flex-none border-2 border-ink bg-lime" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
            {t('timeline.start')} · {draft.originLabel}
          </span>
          <span className="font-mono text-[12px] text-ink">{clockLabel(draft.departAt, isId)}</span>
        </li>
        {stops.map((stop, index) => {
          const name = placeName(stop.place.venue, isId);
          const level = tExplore(`crowd.levels.${crowdLevelKey(stop.place.crowd)}`);
          return (
            <li key={`${stop.place.venue.id}-${index}`} className="relative pl-7">
              <span className="absolute top-0 bottom-0 left-[7px] w-px bg-ash" aria-hidden="true" />
              <p className="flex flex-wrap items-center gap-x-2 py-2 font-mono text-[11px] text-graphite">
                <span>
                  {t('timeline.leg', {
                    km: stop.leg.distanceKm.toFixed(1),
                    minutes: stop.leg.travelMinutes,
                  })}
                </span>
                {stop.leg.corridorDelayMinutes > 0 && (
                  <span className="flex items-center gap-1 bg-ink px-1.5 py-0.5 text-white">
                    <TriangleAlert size={11} aria-hidden="true" />
                    {t('timeline.delay', { count: stop.leg.corridorDelayMinutes })}
                  </span>
                )}
              </p>
              <div className="relative -ml-7 flex items-start gap-3 border border-ink bg-white p-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center border border-ink bg-lime font-mono text-[12px] text-ink">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">{name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink">
                    <span className="font-mono text-[12px]">
                      {t('timeline.arrive', { time: clockLabel(stop.arriveAt, isId) })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CrowdDot
                        busynessPct={stop.place.crowd.busynessPct}
                        isOpen={stop.place.isOpenNow}
                      />
                      {stop.place.isOpenNow
                        ? `${level} ${stop.place.crowd.busynessPct}%`
                        : t('timeline.closed')}
                    </span>
                    {stop.isRedZone && (
                      <span className="border border-ink px-1 font-mono text-[10px] uppercase">
                        {t('timeline.redZone')}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-graphite">
                    {t('timeline.stay', { count: stop.dwellMinutes })}
                  </p>
                </div>
                <div className="-my-3 -mr-3 flex flex-none self-stretch border-l border-ash">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveStop(index, -1)}
                    aria-label={t('timeline.moveUp', { name })}
                    className="flex w-11 items-center justify-center text-ink hover:bg-parchment disabled:opacity-25"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={index === stops.length - 1}
                    onClick={() => onMoveStop(index, 1)}
                    aria-label={t('timeline.moveDown', { name })}
                    className="flex w-11 items-center justify-center border-l border-ash text-ink hover:bg-parchment disabled:opacity-25"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStop(index)}
                    aria-label={t('timeline.remove', { name })}
                    className="flex w-11 items-center justify-center border-l border-ash text-graphite hover:bg-parchment hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4">
        <p className="mb-2 text-eyebrow text-graphite uppercase">{t('timeline.addStop')}</p>
        <StopSearch
          near={draft.origin}
          excludeIds={draft.stops.map((stop) => stop.venueId)}
          disabled={isFull}
          onAdd={onAddStop}
          autoFocus={draft.stops.length === 0}
        />
      </div>
    </div>
  );
}
