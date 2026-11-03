import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { gsap, useGSAP } from '../../lib/gsap';
import { BaliPulseMap } from './BaliPulseMap';

/** Hotspot → calmer alternative pairs shown in the ticker; illustrative, not live data. */
const REROUTE_EXAMPLES: readonly (readonly [string, string])[] = [
  ['Tanah Lot', 'Pantai Balian'],
  ['Tegallalang', 'Jatiluwih'],
  ['Lempuyang', 'Taman Ujung'],
  ['Ulun Danu Beratan', 'Danau Tamblingan'],
  ['Kelingking', 'Pantai Atuh'],
  ['Tegenungan', 'Tibumana'],
  ['Tirta Empul', 'Pura Mengening'],
];

/** Full-height hero: masked headline, one lime CTA, the animated Bali map, and a reroute ticker. */
export function HeroSection(): ReactNode {
  const { t } = useTranslation('landing');
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ defaults: { ease: 'power4.out' } });
        timeline
          .from('[data-hero-line]', { yPercent: 105, duration: 1.1, stagger: 0.09 })
          .from('[data-hero-mark]', { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, '-=0.6')
          .from('[data-hero-fade]', { y: 16, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, '-=0.4')
          .from('[data-hero-map]', { autoAlpha: 0, scale: 0.97, duration: 1 }, 0.2);
      });
    },
    { scope },
  );

  const ticker = REROUTE_EXAMPLES.map(([from, to]) => (
    <span key={from} className="flex flex-none items-center gap-3 pr-10">
      <span>{from}</span>
      <ArrowRight size={14} aria-hidden="true" />
      <span className="bg-lime px-1.5 text-ink">{to}</span>
    </span>
  ));

  return (
    <section ref={scope} className="relative flex min-h-[100svh] flex-col bg-white pt-16">
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_1fr] md:py-16">
        <div>
          <p data-hero-fade className="font-mono text-caption text-graphite uppercase">
            {t('hero.eyebrow')}
          </p>
          <h1 className="mt-5 text-[clamp(58px,15vw,136px)] leading-[0.88] font-medium tracking-[-0.05em] text-ink">
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-hero-line className="block">
                {t('hero.line1')}
              </span>
            </span>{' '}
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-hero-line className="block">
                {t('hero.line2')}
              </span>
            </span>{' '}
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-hero-line className="relative inline-block">
                <span
                  data-hero-mark
                  className="absolute inset-x-[-0.06em] top-[0.12em] bottom-[0.02em] origin-left bg-lime"
                  aria-hidden="true"
                />
                <span className="relative">{t('hero.line3')}</span>
              </span>
            </span>
          </h1>
          <p data-hero-fade className="mt-6 max-w-[34ch] text-body text-graphite md:text-[18px]">
            {t('hero.subtitle')}
          </p>
          <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              to="/app"
              className="group flex h-14 items-center gap-6 border border-ink bg-lime px-6 text-body font-medium text-ink active:scale-[0.99]"
            >
              {t('hero.cta')}
              <ArrowRight
                size={20}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </Link>
            <a
              href="#how"
              className="flex items-center gap-2 text-body-sm text-graphite hover:text-ink"
            >
              {t('hero.secondary')}
              <ArrowDown size={16} />
            </a>
          </div>
        </div>

        <div data-hero-map className="relative border border-ink bg-parchment p-3 sm:p-5">
          <span className="absolute top-2 left-3 font-mono text-[10px] text-graphite">
            8.04°S 114.40°E
          </span>
          <span className="absolute right-3 bottom-2 font-mono text-[10px] text-graphite">
            8.85°S 115.73°E
          </span>
          <BaliPulseMap label={t('hero.mapLabel')} className="h-auto w-full" />
        </div>
      </div>

      <div className="border-y border-ink bg-white py-3" aria-label={t('hero.tickerLabel')}>
        <div className="flex overflow-hidden font-mono text-caption tracking-normal text-ink">
          <div className="marquee flex flex-none">
            {ticker}
            <span className="flex flex-none" aria-hidden="true">
              {ticker}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
