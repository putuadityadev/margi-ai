import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIcon } from '../../components/ui';

export interface SimulationBannerProps {
  readonly className?: string;
  readonly surgePct?: number;
}

export function SimulationBanner({
  className = '',
}: SimulationBannerProps): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');

  return (
    <div
      role="status"
      data-testid="simulation-banner"
      className={`bg-sim-banner text-ink border border-crowd-avg/40 rounded-inner px-4 py-3 flex items-center gap-2.5 text-xs ${className}`}
    >
      <InfoIcon size={16} className="text-ink" />
      <div>
        <span className="font-medium">
          {t('simulationBanner', 'Simulated data — not live conditions')}
        </span>
        <span className="text-graphite ml-1.5">
          {isId
            ? '(contoh skenario jam puncak liburan).'
            : '(peak-hour crowd preview).'}
        </span>
      </div>
    </div>
  );
}

export interface ReplayBannerProps {
  readonly className?: string;
}

export function ReplayBanner({ className = '' }: ReplayBannerProps): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  return (
    <div
      role="status"
      data-testid="replay-banner"
      className={`bg-parchment text-ink border border-ash rounded-inner px-4 py-3 flex items-center gap-2.5 text-xs ${className}`}
    >
      <InfoIcon size={16} className="text-graphite" />
      <span>
        {isId
          ? 'Menampilkan laporan tersimpan terbaru saat layanan sedang sibuk.'
          : 'Replayed result — showing latest saved report while live service is busy.'}
      </span>
    </div>
  );
}

export interface RelaxedMatchBannerProps {
  readonly step: number;
  readonly reasons: readonly string[];
  readonly className?: string;
}

export function RelaxedMatchBanner({
  reasons,
  className = '',
}: RelaxedMatchBannerProps): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');

  return (
    <div
      role="status"
      data-testid="relaxed-banner"
      className={`bg-parchment text-ink border border-ash rounded-inner px-4 py-3 flex items-center gap-2.5 text-xs ${className}`}
    >
      <InfoIcon size={16} className="text-graphite" />
      <span>
        {reasons.length > 0
          ? reasons.join(' · ')
          : isId
            ? 'Jangkauan pencarian diperluas agar Anda tetap mendapat pilihan tempat yang nyaman.'
            : 'Search area widened slightly to give you more comfortable options.'}
      </span>
    </div>
  );
}
