import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface SimulationBannerProps {
  readonly className?: string;
  readonly surgePct?: number;
}

export function SimulationBanner({
  className = '',
  surgePct = 115,
}: SimulationBannerProps): ReactNode {
  const { t } = useTranslation('analyzer');

  return (
    <div
      role="status"
      data-testid="simulation-banner"
      className={`bg-sim-banner text-ink border border-crowd-avg/40 rounded-card p-4 md:p-5 flex items-start gap-3 transition-colors ${className}`}
    >
      <span className="text-lg leading-none select-none shrink-0 pt-0.5" aria-hidden="true">
        ⚠️
      </span>
      <div>
        <div className="font-medium text-sm">
          {t('simulationBanner', 'Simulated data — not live conditions')}
        </div>
        <p className="text-xs text-graphite font-normal mt-0.5">
          Judge Test Mode active: injecting virtual peak hour traffic and {surgePct}% viral crowd
          surge for scenario evaluation (PRD AC-06.3).
        </p>
      </div>
    </div>
  );
}

export interface ReplayBannerProps {
  readonly className?: string;
}

export function ReplayBanner({ className = '' }: ReplayBannerProps): ReactNode {
  return (
    <div
      role="status"
      data-testid="replay-banner"
      className={`bg-charcoal text-parchment border border-crowd-avg/40 rounded-card p-4 md:p-5 flex items-start gap-3 transition-colors ${className}`}
    >
      <span className="text-crowd-avg text-base leading-none select-none shrink-0 pt-0.5">▲</span>
      <div>
        <div className="font-medium text-sm text-parchment">
          Replayed result — AI provider unavailable
        </div>
        <p className="text-xs text-stone font-normal mt-0.5">
          Served from cached Last-Known-Good (LKG) baseline to guarantee zero judge downtime (TDD
          §15).
        </p>
      </div>
    </div>
  );
}

export interface RelaxedMatchBannerProps {
  readonly step: number;
  readonly reasons: readonly string[];
  readonly className?: string;
}

export function RelaxedMatchBanner({
  step,
  reasons,
  className = '',
}: RelaxedMatchBannerProps): ReactNode {
  return (
    <div
      role="status"
      data-testid="relaxed-banner"
      className={`bg-parchment text-ink border border-ash rounded-card p-4 md:p-5 flex items-start gap-3 transition-colors ${className}`}
    >
      <span className="text-stone text-base leading-none select-none shrink-0 pt-0.5">ℹ</span>
      <div>
        <div className="font-medium text-sm">Relaxed Match Criteria Applied (Level {step})</div>
        <p className="text-xs text-graphite font-normal mt-0.5">
          {reasons.length > 0
            ? reasons.join(' · ')
            : 'Expanded search radius or busyness threshold to ensure quality recommendation diversity.'}
        </p>
      </div>
    </div>
  );
}
