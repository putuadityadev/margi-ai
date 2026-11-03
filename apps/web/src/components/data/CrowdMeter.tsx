import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { getCrowdColor } from './crowdScale';

export interface CrowdMeterProps {
  readonly busynessPct: number;
  /** Accessible text, e.g. "Busy, 72%". The visible label is rendered by the parent. */
  readonly label: string;
  readonly className?: string;
}

const SEGMENTS = 10;

/**
 * Ten-segment crowd meter. Segments fill in the crowd colour up to the value;
 * a surge above 100 % fills every segment.
 */
export function CrowdMeter({ busynessPct, label, className }: CrowdMeterProps): ReactNode {
  const filled = Math.min(SEGMENTS, Math.ceil(Math.max(0, busynessPct) / (100 / SEGMENTS)));
  const color = getCrowdColor(busynessPct);
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(busynessPct))}
      className={cn('flex h-1.5 w-full gap-[2px]', className)}
    >
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className="crowd-seg h-full flex-1 bg-ash/60"
          style={
            index < filled
              ? { backgroundColor: color, animationDelay: `${index * 40}ms` }
              : undefined
          }
        />
      ))}
    </span>
  );
}
