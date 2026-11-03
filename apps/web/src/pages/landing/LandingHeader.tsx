import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Minimal landing header: brand, language switch, and a quiet link into the app. */
export function LandingHeader(): ReactNode {
  const { t, i18n } = useTranslation('landing');
  const isId = i18n.language.startsWith('id');

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label={t('nav.home')} className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 border border-ink bg-lime" aria-hidden="true" />
          <span className="text-body-sm font-medium tracking-[0.12em] text-ink">MARGI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isId ? 'en' : 'id')}
            aria-label={t('nav.language')}
            className="h-9 px-2 font-mono text-caption tracking-normal text-graphite hover:text-ink"
          >
            <span className={isId ? 'text-stone' : 'text-ink'}>EN</span>
            <span className="mx-1 text-ash">/</span>
            <span className={isId ? 'text-ink' : 'text-stone'}>ID</span>
          </button>
          <Link
            to="/app"
            className="flex h-9 items-center border border-ink px-3 text-body-sm text-ink transition-colors hover:bg-ink hover:text-white"
          >
            {t('nav.open')}
          </Link>
        </div>
      </div>
    </header>
  );
}
