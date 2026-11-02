import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../components/ui';

export function NotFoundPage(): ReactNode {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <Card tone="parchment" className="space-y-4 text-center">
        <span className="text-xs uppercase tracking-[0.1em] font-medium text-graphite">404</span>
        <h1 className="text-3xl font-medium tracking-tight text-ink">Page Not Found</h1>
        <p className="text-sm text-graphite">
          The path you navigated to does not exist or has been relocated.
        </p>
        <div className="pt-4 flex justify-center">
          <Link to="/">
            <Button variant="primary">{t('actions.retry')}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
