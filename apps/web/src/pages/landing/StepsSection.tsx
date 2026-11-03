import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IntroIllustration,
  type IntroIllustrationKind,
} from '../../features/explore/IntroIllustration';
import { gsap, useGSAP } from '../../lib/gsap';

const STEPS: readonly IntroIllustrationKind[] = ['crowd', 'read', 'calm'];

/** "How it works": the same three illustrations the app onboarding uses. */
export function StepsSection(): ReactNode {
  const { t } = useTranslation('landing');
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-step]', {
          y: 40,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: { trigger: scope.current, start: 'top 75%' },
        });
      });
    },
    { scope },
  );

  return (
    <section id="how" ref={scope} className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="font-mono text-caption text-graphite uppercase">{t('steps.eyebrow')}</p>
        <h2 className="mt-3 max-w-[16ch] text-[clamp(36px,6vw,60px)] leading-[1] font-medium tracking-[-0.04em] text-ink">
          {t('steps.title')}
        </h2>
        <ol className="mt-12 grid gap-px border border-ink bg-ink md:grid-cols-3">
          {STEPS.map((kind, index) => (
            <li key={kind} data-step className="flex flex-col bg-white p-5">
              <span className="font-mono text-caption tracking-normal text-graphite">
                0{index + 1}
              </span>
              <div className="mt-4 aspect-[4/3] border border-ash bg-parchment">
                <IntroIllustration kind={kind} className="h-full w-full" />
              </div>
              <h3 className="mt-5 text-subheading font-medium text-ink">
                {t(`steps.items.${kind}.title`)}
              </h3>
              <p className="mt-2 text-body-sm text-graphite">{t(`steps.items.${kind}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
