import type { ReactNode } from 'react';
import type { DepartureOption } from '@margi-ai/shared';
import { cn } from '../../lib/cn';
import { getCrowdColor } from './crowdScale';

export interface DepartureChartProps {
  readonly options: readonly DepartureOption[];
  readonly bestIndex: number;
  /** Departure currently planned; the nearest slot is outlined. */
  readonly selectedDepartAt: string;
  readonly onSelect: (departAt: string) => void;
  readonly label: string;
  readonly bestLabel: string;
  /** Accessible name for one bar, e.g. "Leave at 07:30: crowd exposure 23". */
  readonly barLabel: (option: DepartureOption) => string;
  readonly timeLabel: (iso: string) => string;
}

const CHART_HEIGHT_PX = 64;
/** Axis labels every 2 hours (4 slots of 30 minutes). */
const AXIS_EVERY_SLOTS = 4;

function nearestIndex(options: readonly DepartureOption[], iso: string): number {
  const target = Date.parse(iso);
  let best = 0;
  options.forEach((option, index) => {
    const current = options[best];
    if (
      current &&
      Math.abs(Date.parse(option.departAt) - target) <
        Math.abs(Date.parse(current.departAt) - target)
    ) {
      best = index;
    }
  });
  return best;
}

/**
 * Crowd exposure on arrival for each departure slot of the day. Bars are buttons that set the
 * departure; the calmest open slot carries a lime cap, slots with a closed stop are greyed.
 */
export function DepartureChart({
  options,
  bestIndex,
  selectedDepartAt,
  onSelect,
  label,
  bestLabel,
  barLabel,
  timeLabel,
}: DepartureChartProps): ReactNode {
  const selected = nearestIndex(options, selectedDepartAt);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{label}</figcaption>
      <div className="flex items-end gap-[2px]" style={{ height: CHART_HEIGHT_PX + 16 }}>
        {options.map((option, index) => {
          const isClosed = option.closedStops > 0;
          const isBest = index === bestIndex;
          const isSelected = index === selected;
          const heightPct = Math.max(8, option.crowdExposure);
          return (
            <button
              key={option.departAt}
              type="button"
              onClick={() => onSelect(option.departAt)}
              aria-label={barLabel(option)}
              aria-pressed={isSelected}
              className="group relative flex h-full flex-1 items-end"
            >
              {isBest && (
                <span className="pointer-events-none absolute -top-0.5 left-1/2 -translate-x-1/2 bg-lime px-1 font-mono text-[9px] whitespace-nowrap text-ink">
                  {bestLabel}
                </span>
              )}
              <span
                className={cn(
                  'crowd-bar block w-full transition-opacity group-hover:opacity-100',
                  isSelected ? 'opacity-100 outline-2 outline-offset-1 outline-ink' : 'opacity-70',
                  isBest && 'border-t-[3px] border-lime',
                )}
                style={{
                  height: `${(heightPct / 100) * CHART_HEIGHT_PX}px`,
                  backgroundColor: isClosed
                    ? 'var(--color-ash)'
                    : getCrowdColor(option.crowdExposure),
                  animationDelay: `${index * 18}ms`,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] font-mono text-[10px] text-graphite" aria-hidden="true">
        {options.map((option, index) => (
          <span key={option.departAt} className="flex-1 overflow-visible whitespace-nowrap">
            {index % AXIS_EVERY_SLOTS === 0 ? timeLabel(option.departAt).slice(0, 2) : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}
