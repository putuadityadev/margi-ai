import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

/** Lime closing band with the second entry into the app, then a hairline footer. */
export function FinalCtaSection(): ReactNode {
  const { t } = useTranslation('landing');
  const { t: tCommon } = useTranslation('common');

  return (
    <>
      <section className="bg-lime py-20 md:py-28">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-10 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[clamp(56px,12vw,132px)] leading-[0.88] font-medium tracking-[-0.05em] text-ink">
            {t('cta.title')}
          </h2>
          <div className="flex flex-col items-start gap-4">
            <Link
              to="/app"
              className="group flex h-14 items-center gap-6 border border-ink bg-ink px-6 text-body font-medium text-white"
            >
              {t('cta.button')}
              <ArrowRight
                size={20}
                className="text-lime transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-ink bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-6 text-caption tracking-normal text-graphite sm:px-6">
          <span>{tCommon('footer.copyright')}</span>
          <nav className="flex gap-5">
            <Link to="/privacy" className="hover:text-ink">
              {tCommon('footer.privacy')}
            </Link>
            <Link to="/about/ai-disclosure" className="hover:text-ink">
              {tCommon('footer.disclosure')}
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
