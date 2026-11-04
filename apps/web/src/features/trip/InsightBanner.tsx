import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { TripInsight } from '@margi-ai/shared';
import { MargiAvatar } from '../../components/brand/MargiAvatar';
import { signed } from './tripText';

export interface InsightBannerProps {
  readonly insight: TripInsight | undefined;
  readonly isChecking: boolean;
  readonly isError: boolean;
  readonly onOpen: () => void;
  readonly onRetry: () => void;
}

/**
 * MARGI speaks first: a banner on the plan tab with the result of an automatic plan review,
 * so improvements are offered before the traveller thinks to ask.
 */
export function InsightBanner({
  insight,
  isChecking,
  isError,
  onOpen,
  onRetry,
}: InsightBannerProps): ReactNode {
  const { t } = useTranslation('trip');

  if (isError && !insight) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 border border-ink px-3 py-2.5"
      >
        <span className="text-body-sm text-ink">{t('insight.error')}</span>
        <button type="button" onClick={onRetry} className="text-body-sm text-ink underline">
          {t('error.retry')}
        </button>
      </div>
    );
  }

  if (isChecking && !insight) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 border border-ash bg-parchment px-3 py-2.5"
      >
        <MargiAvatar mood="thinking" size={32} tracking={false} />
        <span className="text-body-sm text-graphite">{t('insight.checking')}</span>
      </div>
    );
  }
  if (!insight) return null;

  const count = insight.suggestions.length;
  if (count === 0) {
    return (
      <div className="flex items-center gap-3 border border-ash bg-parchment px-3 py-2.5">
        <MargiAvatar mood="happy" size={32} tracking={false} />
        <span className="text-body-sm text-ink">{t('insight.calm')}</span>
      </div>
    );
  }

  const bestDrop = Math.min(
    ...insight.suggestions.map((suggestion) => suggestion.delta.crowdExposurePts),
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 border border-ink bg-lime px-3 py-2.5 text-left"
    >
      <MargiAvatar size={32} />
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium text-ink">
          {t('insight.found', { count })}
        </span>
        {bestDrop < 0 && (
          <span className="block font-mono text-[11px] text-ink">
            {t('insight.best', { value: signed(bestDrop).replace('−', '') })}
          </span>
        )}
      </span>
      <span className="flex flex-none items-center gap-1 text-body-sm text-ink">
        {t('insight.open')}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}
