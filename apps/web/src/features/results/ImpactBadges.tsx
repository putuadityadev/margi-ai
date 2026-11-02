import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ImpactBadgesProps {
  readonly timeSavedMin: readonly [number, number];
  readonly fiscalBoost: boolean;
  readonly supportsMsmeCount: number;
  readonly className?: string;
}

export function ImpactBadges({
  timeSavedMin,
  fiscalBoost,
  supportsMsmeCount,
  className = '',
}: ImpactBadgesProps): ReactNode {
  const { t } = useTranslation('results');
  const [showBoostInfo, setShowBoostInfo] = useState<boolean>(false);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`} data-testid="impact-badges">
      {/* 1. Time Saved Badge */}
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-parchment text-ink border border-ash text-xs font-mono"
        data-testid="badge-time-saved"
      >
        <span className="text-stone">⏱</span>
        <span>
          {t('timeSaved', 'Time saved')} ~{timeSavedMin[0]}–{timeSavedMin[1]} min
        </span>
      </span>

      {/* 2. Fiscal Equity Boost Badge */}
      {fiscalBoost ? (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowBoostInfo((prev) => !prev)}
            onMouseEnter={() => setShowBoostInfo(true)}
            onMouseLeave={() => setShowBoostInfo(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-[#22221c] text-lime border border-lime/30 text-xs font-mono font-medium hover:bg-charcoal cursor-pointer focus-visible:outline-none"
            aria-label="Fiscal Equity Boost information"
            data-testid="badge-fiscal-boost"
          >
            <span>⚖️ Fiscal Equity Boost</span>
            <span className="text-[10px] text-lime/80 underline decoration-dotted">Why?</span>
          </button>

          {showBoostInfo ? (
            <div
              role="tooltip"
              className="absolute left-0 bottom-full mb-1 z-30 w-64 p-2.5 rounded-inner bg-charcoal text-parchment border border-stone text-[11px] font-sans leading-normal"
              data-testid="fiscal-boost-tooltip"
            >
              {t(
                'whyThisBoost',
                'Directs tourism revenue to underdeveloped recipient regencies to counter southern Bali over-concentration.',
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3. MSME Support Badge */}
      {supportsMsmeCount > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-parchment text-ink border border-ash text-xs font-mono"
          data-testid="badge-msme-support"
        >
          <span>🛍</span>
          <span>Supports {supportsMsmeCount} local MSMEs</span>
        </span>
      ) : null}
    </div>
  );
}
