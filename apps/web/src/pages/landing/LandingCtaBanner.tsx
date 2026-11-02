import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../components/ui';

export function LandingCtaBanner(): ReactNode {
  const { t } = useTranslation('landing');

  return (
    <section className="py-12 md:py-20">
      <Card tone="parchment" className="p-8 md:p-14 border border-ash text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-heading md:text-heading-lg font-medium text-ink tracking-tight">
            {t('ctaSection.title')}
          </h2>
          <p className="text-body text-graphite leading-relaxed font-normal">
            {t('ctaSection.subtitle')}
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link to="/app">
            <Button variant="primary" size="lg" className="px-8 py-4 text-base">
              {t('ctaSection.button')}
              <span aria-hidden="true">→</span>
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
