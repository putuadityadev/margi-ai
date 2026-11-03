import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP } from '../../lib/gsap';

const FACTS = ['visitors', 'gridlock', 'bangli'] as const;

/** Dark island with three sourced numbers (BRD §1) that frame the problem. */
export function FactsSection(): ReactNode {
  const { t } = useTranslation('landing');
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-fact-value]', {
          yPercent: 100,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: scope.current, start: 'top 70%' },
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="bg-charcoal py-20 text-parchment md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="font-mono text-caption text-smoke uppercase">{t('facts.eyebrow')}</p>
        <h2 className="mt-3 max-w-[18ch] text-[clamp(36px,6vw,60px)] leading-[1] font-medium tracking-[-0.04em]">
          {t('facts.title')}
        </h2>
        <dl className="mt-14 grid gap-10 border-t border-stone/40 pt-10 md:grid-cols-3">
          {FACTS.map((fact) => (
            <div key={fact}>
              <dt className="overflow-hidden">
                <span
                  data-fact-value
                  className="block font-mono text-[clamp(56px,9vw,96px)] leading-none tracking-[-0.06em] text-lime"
                >
                  {t(`facts.items.${fact}.value`)}
                </span>
              </dt>
              <dd className="mt-4 max-w-[28ch] text-body text-smoke">
                {t(`facts.items.${fact}.label`)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-caption tracking-normal text-stone">{t('facts.source')}</p>
      </div>
    </section>
  );
}
