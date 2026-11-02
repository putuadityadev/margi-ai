import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { rankScore } from '@margi-ai/shared';

export interface ScoreExplainerProps {
  readonly simVibe: number;
  readonly cfs: number;
  readonly fiscalBoost: boolean;
  readonly serverRank: number;
  readonly className?: string;
}

export function ScoreExplainer({
  simVibe,
  cfs,
  fiscalBoost,
  serverRank,
  className = '',
}: ScoreExplainerProps): ReactNode {
  const { t } = useTranslation('results');

  // Client-side deterministic recomputation (TDD §3, BRD §7.3)
  const eFiscal = fiscalBoost ? 100 : 0;
  const clientComputed = rankScore(simVibe, cfs, eFiscal);
  const diff = Math.abs(clientComputed - serverRank);
  const isMatch = diff <= 0.1;

  return (
    <details
      className={`text-xs font-mono text-stone group ${className}`}
      data-testid="score-explainer"
    >
      <summary className="cursor-pointer hover:text-ink select-none flex items-center gap-1.5 focus-visible:outline-none focus-visible:text-ink">
        <span className="underline decoration-dotted">
          {t('howCalculated', 'How is this calculated?')}
        </span>
        <span className="text-[10px] group-open:rotate-180 transition-transform">▼</span>
      </summary>

      <div className="mt-2.5 p-3 rounded-inner bg-[#22221c] text-parchment border border-stone/40 space-y-2 text-[11px] leading-relaxed">
        <div className="font-medium text-lime">
          Formula: R = 0.50 × Sim + 0.35 × (100 - CFS) + 0.15 × E_fiscal
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-stone/20 text-stone">
          <div>
            1. Vibe Similarity:{' '}
            <strong className="text-parchment font-medium tabular-nums">{Math.round(simVibe)}%</strong>
            <span className="block text-[10px]">(weight: 50%)</span>
          </div>

          <div>
            2. Crowd Ease:{' '}
            <strong className="text-parchment font-medium tabular-nums">
              {Math.round(100 - cfs)}%
            </strong>
            <span className="block text-[10px]">(CFS: {Math.round(cfs)}, weight: 35%)</span>
          </div>

          <div>
            3. Fiscal Equity:{' '}
            <strong className="text-parchment font-medium tabular-nums">{eFiscal}</strong>
            <span className="block text-[10px]">(weight: 15%)</span>
          </div>
        </div>

        <div className="pt-2 border-t border-stone/20 flex items-center justify-between">
          <span>Client Recomputed Score:</span>
          <span className="font-medium tabular-nums text-lime" data-testid="client-computed-rank">
            {clientComputed.toFixed(1)} / 100
          </span>
        </div>

        <div className="text-[10px] text-stone">
          {isMatch ? (
            <span className="text-lime">✓ 100% Deterministic match with server pipeline</span>
          ) : (
            <span>Server rank: {serverRank.toFixed(1)}</span>
          )}
        </div>
      </div>
    </details>
  );
}
