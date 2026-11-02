import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Pill } from '../../components/ui';

export function LandingPlaceholderPage(): ReactNode {
  const { t } = useTranslation('landing');

  return (
    <div className="mx-auto max-w-5xl px-6 py-20 space-y-12">
      <div className="space-y-4 max-w-2xl">
        <Pill tone="sim">{t('hero.eyebrow')}</Pill>
        <h1 className="text-display tracking-tight text-ink">{t('hero.title')}</h1>
        <p className="text-body text-graphite leading-relaxed">{t('hero.subtitle')}</p>
        <div className="pt-4 flex flex-wrap items-center gap-4">
          <Link to="/app">
            <Button variant="primary" size="lg">
              {t('hero.cta')}
            </Button>
          </Link>
          <Link to="/about/ai-disclosure">
            <Button variant="ghost" size="lg">
              {t('hero.secondaryCta')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <Card tone="parchment" className="p-6">
          <div className="text-2xl font-medium text-ink">82%</div>
          <p className="mt-2 text-xs text-graphite">{t('stats.overtourism')}</p>
        </Card>
        <Card tone="dark" className="p-6">
          <div className="text-2xl font-medium text-parchment">3.5 hrs</div>
          <p className="mt-2 text-xs text-graphite">{t('stats.queueTime')}</p>
        </Card>
        <Card tone="white" className="p-6">
          <div className="text-2xl font-medium text-ink">+38%</div>
          <p className="mt-2 text-xs text-graphite">{t('stats.msmeBoost')}</p>
        </Card>
      </div>
    </div>
  );
}
