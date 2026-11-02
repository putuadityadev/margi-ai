import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';

export function AnalyzerPage(): ReactNode {
  const { t } = useTranslation('analyzer');

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Pill tone="sim">Analyzer Engine</Pill>
        <h1 className="text-2xl font-medium tracking-tight text-ink">{t('title')}</h1>
      </div>
      <Card tone="parchment">
        <p className="text-sm text-graphite">Interactive Analyzer input panel arriving in T-045.</p>
      </Card>
    </div>
  );
}
