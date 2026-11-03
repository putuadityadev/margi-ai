import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, InfoIcon } from '../../components/ui';
import { useAnalyzerStore } from '../../stores/analyzerStore';

export function SimulationToggle(): ReactNode {
  const { t } = useTranslation('analyzer');
  const simulate = useAnalyzerStore((s) => s.simulate);
  const setSimulate = useAnalyzerStore((s) => s.setSimulate);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4 p-3.5 rounded-none border border-ash bg-white">
        <label
          htmlFor="simulation-switch"
          className="text-body-sm font-medium text-ink cursor-pointer select-none leading-snug"
        >
          {t('simulationToggle')}
        </label>
        <Switch
          id="simulation-switch"
          checked={simulate}
          onChange={setSimulate}
          aria-label={t('simulationToggle')}
        />
      </div>

      {simulate && (
        <div
          role="status"
          className="p-3 rounded-none bg-parchment text-ink text-xs font-medium border border-ash flex items-center gap-2"
        >
          <InfoIcon size={15} className="text-ink" />
          <span>{t('simulationBanner')}</span>
        </div>
      )}
    </div>
  );
}
