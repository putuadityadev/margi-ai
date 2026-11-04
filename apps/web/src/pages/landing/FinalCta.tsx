import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from 'lucide-react';
import { gsap, motionAllowed } from './motion';

/** Closing call to action; the calm half of the hero artwork returns and rises into place. */
export function FinalCta(): ReactNode {
  const { t, i18n } = useTranslation('landing');
  const { t: tCommon } = useTranslation('common');
  const isId = i18n.language.startsWith('id');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      gsap.fromTo(
        '[data-final-art]',
        { yPercent: 18 },
        {
          yPercent: -4,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        },
      );
      gsap.from('[data-final-line]', {
        yPercent: 115,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-final-title]', start: 'top 82%', once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-white">
      <div className="relative z-10 mx-auto flex max-w-[1100px] flex-col items-center px-5 pb-[8svh] pt-[18svh] text-center sm:px-8">
        <h2
          data-final-title
          className="text-[clamp(46px,9.5vw,150px)] font-medium leading-[0.94] tracking-[-0.05em]"
        >
          {t('cta.title')
            .split(' ')
            .reduce<string[]>((lines, word) => {
              const last = lines[lines.length - 1];
              if (last !== undefined && last.split(' ').length < 2)
                lines[lines.length - 1] = `${last} ${word}`;
              else lines.push(word);
              return lines;
            }, [])
            .map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <span data-final-line className="block">
                  {line}
                </span>
              </span>
            ))}
        </h2>
        <p className="mt-6 max-w-[28rem] text-body leading-[1.55] text-charcoal">{t('cta.body')}</p>
        <Link
          to="/app"
          className="group mt-9 flex h-14 items-center gap-3 border border-ink bg-ink pl-6 pr-2 text-body font-medium text-white transition-colors duration-300 hover:bg-lime hover:text-ink"
        >
          {t('cta.button')}
          <span className="flex h-10 w-10 items-center justify-center bg-lime text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-lime">
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </div>

      <div className="relative h-[46svh] min-h-[280px] md:h-[min(40vw,58svh)]">
        <div
          data-final-art
          className="absolute inset-x-0 bottom-0 h-full [mask-image:linear-gradient(to_bottom,transparent,#000_30%)]"
        >
          <picture>
            <source
              type="image/avif"
              srcSet="/images/hero-1000.avif 1000w, /images/hero.avif 1672w"
              sizes="100vw"
            />
            <img
              src="/images/hero.webp"
              alt={t('cta.art')}
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-[88%_100%]"
            />
          </picture>
        </div>
      </div>

      <footer className="relative z-10 border-t border-ink bg-white">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-caption text-graphite sm:px-8">
          <span>{tCommon('footer.copyright')}</span>
          <nav className="flex gap-6" aria-label={isId ? 'Tautan hukum' : 'Legal links'}>
            <Link to="/privacy" className="hover:text-ink">
              {tCommon('footer.privacy')}
            </Link>
            <Link to="/about/ai-disclosure" className="hover:text-ink">
              {tCommon('footer.disclosure')}
            </Link>
          </nav>
        </div>
      </footer>
    </section>
  );
}
