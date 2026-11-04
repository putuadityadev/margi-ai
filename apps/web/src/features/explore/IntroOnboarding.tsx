import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { gsap, useGSAP } from '../../lib/gsap';
import { IntroIllustration, type IntroIllustrationKind } from './IntroIllustration';

export interface IntroOnboardingProps {
  readonly onDone: () => void;
}

const SLIDES: readonly IntroIllustrationKind[] = ['crowd', 'read', 'calm'];
/** Horizontal travel, in px, that counts as a swipe between slides. */
const SWIPE_THRESHOLD_PX = 48;

/** Three-slide intro shown before the first scan. Swipe, arrow keys, or buttons advance it. */
export function IntroOnboarding({ onDone }: IntroOnboardingProps): ReactNode {
  const { t } = useTranslation('explore');
  const [index, setIndex] = useState(0);
  const scope = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const slide = SLIDES[index] ?? 'crowd';
  const isLast = index === SLIDES.length - 1;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-intro-line]', {
          yPercent: 110,
          duration: 0.7,
          ease: 'power4.out',
          stagger: 0.08,
        });
        gsap.from('[data-intro-art]', {
          autoAlpha: 0,
          scale: 0.96,
          duration: 0.6,
          ease: 'power2.out',
        });
      });
    },
    { scope, dependencies: [index], revertOnUpdate: true },
  );

  const go = (next: number): void => {
    if (next < 0) return;
    if (next >= SLIDES.length) {
      onDone();
      return;
    }
    setIndex(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    swipeStartX.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (swipeStartX.current === null) return;
    const dx = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD_PX) go(index + 1);
    if (dx >= SWIPE_THRESHOLD_PX) go(index - 1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowRight') go(index + 1);
    if (event.key === 'ArrowLeft') go(index - 1);
  };

  return (
    <section
      ref={scope}
      aria-roledescription="carousel"
      aria-label={t('intro.progress', { current: index + 1, total: SLIDES.length })}
      className="absolute inset-0 z-30 flex flex-col bg-white"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <ol className="flex flex-1 gap-1.5" aria-hidden="true">
            {SLIDES.map((kind, slideIndex) => (
              <li key={kind} className="h-[3px] flex-1 bg-ash">
                <span
                  className="block h-full origin-left bg-ink transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${slideIndex <= index ? 1 : 0})` }}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={onDone}
            className="px-1 py-2 text-caption tracking-normal text-graphite hover:text-ink"
          >
            {t('intro.skip')}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <div data-intro-art className="aspect-[4/3] w-full border border-ash bg-parchment">
            <IntroIllustration kind={slide} className="h-full w-full" />
          </div>
        </div>

        <div aria-live="polite" className="space-y-3 pb-8">
          <p className="font-mono text-caption text-graphite">
            0{index + 1} / 0{SLIDES.length}
          </p>
          <h1 className="overflow-hidden text-[40px] leading-[1.02] font-medium tracking-[-0.035em] text-ink sm:text-[48px]">
            <span data-intro-line className="block">
              {t(`intro.slides.${slide}.title`)}
            </span>
          </h1>
          <p className="overflow-hidden text-body text-graphite">
            <span data-intro-line className="block">
              {t(`intro.slides.${slide}.body`)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          className="group flex h-14 w-full items-center justify-between border border-ink bg-lime px-5 text-body font-medium text-ink active:scale-[0.99]"
        >
          <span>{isLast ? t('intro.start') : t('intro.next')}</span>
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
}
