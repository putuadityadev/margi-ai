import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AccountMenu } from '../../features/account/AccountMenu';
import { useMe } from '../../features/auth/useMe';
import { apiClient } from '../../lib/apiClient';

/** Shell for sign-in, curator console and legal pages. The main app uses AppShell instead. */
export function RootLayout(): ReactNode {
  const { t, i18n } = useTranslation();
  const { user } = useMe();
  const isId = i18n.language.startsWith('id');

  const toggleLanguage = (): void => {
    const next = isId ? 'en' : 'id';
    void i18n.changeLanguage(next);
    if (user) {
      // Remember the choice on the account; a failed sync only means it is not remembered.
      void apiClient('/me/profile', { method: 'PATCH', body: { locale: next } }).catch(() => {});
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-lime focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-ink focus:outline-none"
      >
        {t('nav.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 border-b border-ink bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2" aria-label="MARGI AI">
            <span className="h-3 w-3 border border-ink bg-lime" aria-hidden="true" />
            <span className="text-body font-medium tracking-[0.08em]">MARGI AI</span>
          </Link>
          <Link
            to="/app"
            className="ml-4 hidden text-body-sm text-graphite underline-offset-4 hover:text-ink hover:underline sm:inline"
          >
            {isId ? 'Buka aplikasi' : 'Open the app'}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={isId ? 'Ganti bahasa' : 'Switch language'}
              className="flex h-11 w-11 items-center justify-center border border-ink bg-white font-mono text-caption"
            >
              {isId ? 'EN' : 'ID'}
            </button>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ash px-4 py-6 text-center text-caption text-graphite">
        <Link to="/privacy" className="underline-offset-4 hover:underline">
          {isId ? 'Privasi' : 'Privacy'}
        </Link>
        <span aria-hidden="true"> · </span>
        <Link to="/about/ai-disclosure" className="underline-offset-4 hover:underline">
          {isId ? 'Penggunaan AI' : 'AI disclosure'}
        </Link>
      </footer>
    </div>
  );
}
