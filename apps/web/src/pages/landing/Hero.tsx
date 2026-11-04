import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGSAP } from '@gsap/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { gsap, motionAllowed, scrollToSection } from './motion';

/** One picture element, reused for the artwork and its desaturated "crowd" twin. */
function HeroPicture({ alt, className }: { alt: string; className?: string }): ReactNode {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/images/hero-1000.avif 1000w, /images/hero.avif 1672w"
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet="/images/hero-1000.webp 1000w, /images/hero.webp 1672w"
        sizes="100vw"
      />
      <img
        src="/images/hero.webp"
        alt={alt}
        width={1672}
        height={941}
        decoding="async"
        fetchPriority="high"
        className={className}
      />
    </picture>
  );
}

/**
 * The hero is the product's argument in one picture: a crowded road on the left, a calm path on
 * the right. On scroll the artwork drifts at a different speed than the page (parallax) and the
 * crowded side slowly loses its colour while the calm side stays alive.
 */
export function Hero(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return;

      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('[data-line]', { yPercent: 118, duration: 1.2, stagger: 0.14 }, 0.1)
        .from('[data-fade]', { opacity: 0, y: 20, duration: 1, stagger: 0.12 }, 0.6)
        .from('[data-art]', { opacity: 0, scale: 1.06, yPercent: 5, duration: 2 }, 0);

      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        })
        .to('[data-copy]', { yPercent: -22, opacity: 0, ease: 'none' }, 0)
        .to('[data-art-inner]', { yPercent: 14, scale: 1.12, ease: 'none' }, 0)
        .to('[data-crowd]', { opacity: 1, ease: 'none', duration: 0.4 }, 0.02);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-white">
      <div
        data-copy
        className="absolute inset-x-0 top-[11svh] z-10 mx-auto flex max-w-[1400px] flex-col items-center px-5 text-center md:top-[12svh]"
      >
        <h1 className="text-[clamp(42px,5vw,84px)] font-medium leading-[0.92] tracking-[-0.05em] text-ink">
          <span className="block overflow-hidden whitespace-nowrap pb-[0.06em] md:inline-block">
            <span data-line className="block">
              {t('hero.line1')}
            </span>
          </span>{' '}
          <span className="block overflow-hidden whitespace-nowrap pb-[0.06em] md:inline-block">
            <span data-line className="block">
              {t('hero.line2')}
            </span>
          </span>
        </h1>
        <p
          data-fade
          className="mt-5 max-w-[40rem] text-[clamp(15px,1.2vw,18px)] leading-[1.5] text-charcoal"
        >
          {t('hero.subtitle')}
        </p>
        <div data-fade className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app"
            className="group flex h-14 items-center gap-3 border border-ink bg-ink pl-6 pr-2 text-body font-medium text-white transition-colors duration-300 hover:bg-lime hover:text-ink"
          >
            {t('hero.cta')}
            <span className="flex h-10 w-10 items-center justify-center bg-lime text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-lime">
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => scrollToSection('showcase')}
            className="flex h-14 items-center gap-2 px-4 text-body font-medium text-ink underline-offset-[6px] hover:underline"
          >
            {t('hero.secondary')}
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        data-art
        className="absolute inset-x-0 bottom-0 h-[58svh] md:bottom-[-3svh] [mask-image:linear-gradient(to_bottom,#000_82%,transparent)] md:h-[min(56.3vw,74svh)]"
      >
        <div data-art-inner className="absolute inset-0 origin-bottom">
          <HeroPicture
            alt={t('hero.art')}
            className="h-full w-full object-cover object-[50%_100%] md:object-contain md:object-bottom"
          />
          <div
            data-crowd
            aria-hidden="true"
            className="absolute inset-0 opacity-0 [filter:grayscale(1)_contrast(0.8)_brightness(1.08)] [mask-image:linear-gradient(to_right,#000_0%,#000_30%,transparent_42%)]"
          >
            <HeroPicture
              alt=""
              className="h-full w-full object-cover object-[50%_100%] md:object-contain md:object-bottom"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
