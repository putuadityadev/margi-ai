import type { ReactNode } from 'react';
import type { HourlyCrowd } from '@margi-ai/shared';
import { getCrowdColor } from './crowdScale';

export interface CrowdTimelineProps {
  readonly hours: readonly HourlyCrowd[];
  readonly currentHour: number;
  readonly quietHours: readonly number[];
  /** Accessible summary of the chart (the bars themselves are decorative). */
  readonly label: string;
  /** Short word shown under closed hours, e.g. "closed". */
  readonly closedLabel: string;
}

/** Visible window of the day: most Bali attractions operate between 06:00 and 21:00 WITA. */
const FIRST_HOUR = 6;
const LAST_HOUR = 21;
const AXIS_EVERY_HOURS = 3;
const CHART_HEIGHT_PX = 72;

function pad(hour: number): string {
  return String(hour).padStart(2, '0');
}

/**
 * Hour-by-hour crowd bars for one day. The evaluated hour is outlined in ink and
 * the quietest open hours carry a lime cap, so the chart reads without colour alone.
 */
export function CrowdTimeline({
  hours,
  currentHour,
  quietHours,
  label,
  closedLabel,
}: CrowdTimelineProps): ReactNode {
  const visible = hours.filter((entry) => entry.hour >= FIRST_HOUR && entry.hour <= LAST_HOUR);

  return (
    <figure className="m-0" role="img" aria-label={label}>
      <div className="flex items-end gap-[3px]" style={{ height: CHART_HEIGHT_PX }}>
        {visible.map((entry, index) => {
          const isNow = entry.hour === currentHour;
          const isQuiet = quietHours.includes(entry.hour);
          const isClosed = entry.busynessPct === 0;
          const heightPct = isClosed ? 4 : Math.max(8, Math.min(100, entry.busynessPct));
          return (
            <span key={entry.hour} className="relative flex h-full flex-1 items-end">
              {isQuiet && !isClosed && (
                <span
                  className="absolute inset-x-0 h-[3px] bg-lime"
                  style={{ bottom: `calc(${heightPct}% + 3px)` }}
                />
              )}
              <span
                className={`crowd-bar block w-full ${isNow ? 'outline-2 outline-offset-1 outline-ink' : ''}`}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isClosed ? 'var(--color-ash)' : getCrowdColor(entry.busynessPct),
                  opacity: isNow || isClosed ? 1 : 0.78,
                  animationDelay: `${index * 28}ms`,
                }}
              />
            </span>
          );
        })}
      </div>
      <figcaption className="mt-2 flex gap-[3px] font-mono text-[10px] text-graphite">
        {visible.map((entry) => (
          <span key={entry.hour} className="flex-1 overflow-visible whitespace-nowrap">
            {(entry.hour - FIRST_HOUR) % AXIS_EVERY_HOURS === 0 ? pad(entry.hour) : ''}
          </span>
        ))}
        <span className="sr-only">{closedLabel}</span>
      </figcaption>
    </figure>
  );
}
