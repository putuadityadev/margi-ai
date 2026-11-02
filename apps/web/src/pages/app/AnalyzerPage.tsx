import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from '../../components/ui';
import { AnalyzerInputPanel } from '../../features/analyzer/AnalyzerInputPanel';

export function AnalyzerPage(): ReactNode {
  const { t } = useTranslation('analyzer');
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  const handleAnalyze = (): void => {
    setHasStartedAnalysis(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 pb-28 md:pb-12">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Pill tone="dark">Autonomous Engine</Pill>
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-graphite">
            Multi-Agent Rerouting
          </span>
        </div>
        <h1 className="text-heading md:text-heading-lg font-medium tracking-tight text-ink">
          {t('title')}
        </h1>
        <p className="text-body text-graphite max-w-2xl font-normal leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      <AnalyzerInputPanel onAnalyze={handleAnalyze} />

      {hasStartedAnalysis && (
        <div
          role="status"
          className="p-6 rounded-card bg-charcoal text-parchment border border-stone text-center space-y-2"
        >
          <p className="text-body font-medium">Analysis dispatched to 3-Agent pipeline.</p>
          <p className="text-caption text-smoke">
            Real-time SSE Thought Stream and Results Dashboard connected in T-046 & T-048.
          </p>
        </div>
      )}
    </div>
  );
}
