import type { ReactNode } from 'react';
import type { HourlyCrowd } from '@margi-ai/shared';
import { cn } from '../../lib/cn';

const FIRST_HOUR = 6;
const LAST_HOUR = 21;
const MAX_PCT = 100;

export interface HourBarsProps {
  readonly today: readonly HourlyCrowd[];
  readonly quietHours: readonly number[];
  /** WITA hour of the visit, highlighted so the traveller sees where "now" sits. */
  readonly currentHour: number;
  readonly label: string;
  readonly isId: boolean;
}

/** Compact forecast for the daylight hours: bar height is the crowd, lime marks the quietest hours. */
export function HourBars({
  today,
  quietHours,
  currentHour,
  label,
  isId,
}: HourBarsProps): ReactNode {
  const hours = today.filter((entry) => entry.hour >= FIRST_HOUR && entry.hour <= LAST_HOUR);
  const tick = (hour: number): string => (isId ? `${String(hour).padStart(2, '0')}` : `${hour}`);

  return (
    <figure className="space-y-1" aria-label={label}>
      <div className="flex h-12 items-end gap-[3px]" aria-hidden="true">
        {hours.map((entry) => (
          <span
            key={entry.hour}
            className={cn(
              'flex-1',
              quietHours.includes(entry.hour)
                ? 'bg-lime outline outline-1 outline-ink'
                : entry.hour === currentHour
                  ? 'bg-ink'
                  : 'bg-ash',
            )}
            style={{ height: `${Math.max(6, Math.min(MAX_PCT, entry.busynessPct))}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-graphite" aria-hidden="true">
        <span>{tick(FIRST_HOUR)}</span>
        <span>{tick(12)}</span>
        <span>{tick(18)}</span>
        <span>{tick(LAST_HOUR)}</span>
      </div>
    </figure>
  );
}
