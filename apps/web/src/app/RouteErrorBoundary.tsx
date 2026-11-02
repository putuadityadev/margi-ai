import { type ReactNode } from 'react';
import { Link, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Pill } from '../components/ui';

export function RouteErrorBoundary(): ReactNode {
  const error = useRouteError();
  const { t } = useTranslation();
  const detail = error instanceof Error ? error.message : 'Unexpected application error';

  return (
    <div className="mx-auto max-w-xl px-6 py-24" role="alert">
      <Card tone="white" className="space-y-4">
        <Pill tone="dark">System Error</Pill>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Something went wrong</h1>
        <p className="text-sm text-graphite">{detail}</p>
        <div className="pt-4 flex gap-3">
          <Link to="/">
            <Button variant="primary">{t('actions.retry')}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
