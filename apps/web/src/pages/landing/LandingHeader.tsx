import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';

/** Fixed header: transparent over the hero, a quiet white bar once the page has moved. */
export function LandingHeader(): ReactNode {
  const { t, i18n } = useTranslation('landing');
  const isId = i18n.language.startsWith('id');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-30 transition-colors duration-500',
        scrolled ? 'border-b border-ink/10 bg-white/95 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label={t('nav.home')} className="flex items-center gap-2.5">
          <span className="h-4 w-4 border border-ink bg-lime" aria-hidden="true" />
          <span className="text-body font-medium tracking-[0.1em] text-ink">MARGI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isId ? 'en' : 'id')}
            aria-label={t('nav.language')}
            className="h-10 px-3 text-body-sm font-medium text-graphite transition-colors hover:text-ink"
          >
            <span className={isId ? 'text-stone' : 'text-ink'}>EN</span>
            <span className="mx-1.5 text-ash">/</span>
            <span className={isId ? 'text-ink' : 'text-stone'}>ID</span>
          </button>
          <Link
            to="/app"
            className="flex h-10 items-center border border-ink bg-ink px-4 text-body-sm font-medium text-white transition-colors duration-300 hover:bg-lime hover:text-ink"
          >
            {t('nav.open')}
          </Link>
        </div>
      </div>
    </header>
  );
}
