import type { ReactNode } from 'react';
import type { TelemetryTier } from '@margi-ai/shared';
import { classifyBusyness } from '@margi-ai/shared';

export interface BusynessBadgeProps {
  readonly bEff: number;
  readonly tier: TelemetryTier;
  readonly synthetic?: boolean;
  readonly className?: string;
  readonly showTier?: boolean;
}

export function getBusynessLabel(bEff: number): {
  key: string;
  name: string;
  colorClass: string;
} {
  if (bEff > 100) {
    return {
      key: 'surge',
      name: 'Surge',
      colorClass: 'bg-crowd-surge/15 text-crowd-surge border-crowd-surge/40',
    };
  }

  const classified = classifyBusyness(bEff);
  switch (classified) {
    case 'low':
      return {
        key: 'low',
        name: 'Low',
        colorClass: 'bg-crowd-low/15 text-crowd-low border-crowd-low/30',
      };
    case 'below_average':
      return {
        key: 'below_average',
        name: 'Below Avg',
        colorClass: 'bg-crowd-below/15 text-crowd-below border-crowd-below/30',
      };
    case 'average':
      return {
        key: 'average',
        name: 'Average',
        colorClass: 'bg-crowd-avg/15 text-crowd-avg border-crowd-avg/30',
      };
    case 'above_average':
      return {
        key: 'above_average',
        name: 'Above Avg',
        colorClass: 'bg-crowd-above/15 text-crowd-above border-crowd-above/30',
      };
    case 'high':
    default:
      return {
        key: 'high',
        name: 'High',
        colorClass: 'bg-crowd-high/15 text-crowd-high border-crowd-high/30',
      };
  }
}

export function formatTierLabel(tier: TelemetryTier, synthetic = false): string {
  if (tier === 'SIMULATION') {
    return synthetic ? 'Simulated (baseline)' : 'Simulated';
  }
  if (tier === 'LIVE') {
    return 'Live';
  }
  return 'Forecast';
}

export function BusynessBadge({
  bEff,
  tier,
  synthetic = false,
  className = '',
  showTier = true,
}: BusynessBadgeProps): ReactNode {
  const meta = getBusynessLabel(bEff);
  const tierLabel = formatTierLabel(tier, synthetic);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-mono font-medium tracking-wide ${meta.colorClass} ${className}`}
      data-testid="busyness-badge"
      data-tier={tierLabel}
      data-busyness={bEff}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      <span>{Math.round(bEff)}%</span>
      <span className="text-[11px] opacity-80">({meta.name})</span>
      {showTier ? (
        <span className="text-[10px] uppercase opacity-75 border-l border-current/30 pl-1.5 ml-0.5">
          {tierLabel}
        </span>
      ) : null}
    </span>
  );
}
