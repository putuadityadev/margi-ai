import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '../../components/ui';

export function LoginPage(): ReactNode {
  const { t } = useTranslation('auth');

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card tone="white">
        <h1 className="text-xl font-medium tracking-tight text-ink">{t('signInTitle')}</h1>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            id="login-email"
            label={t('emailLabel')}
            type="email"
            placeholder="name@example.com"
          />
          <Input id="login-password" label={t('passwordLabel')} type="password" />
          <Button variant="primary" type="submit" className="w-full">
            {t('continueButton')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
