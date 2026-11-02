import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { gsap, useGSAP } from '../../lib/gsap';

export function ProblemNumbersSection(): ReactNode {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);
  const statsGridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!statsGridRef.current || !sectionRef.current) return;

        gsap.from(statsGridRef.current.children, {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
          y: 28,
          opacity: 0,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power2.out',
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-12 md:py-20">
      <Card tone="dark" className="p-8 md:p-14 space-y-12 border-none">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <Pill tone="outline" className="border-stone text-stone">
            {t('stats.eyebrow')}
          </Pill>
          <h2 className="text-heading md:text-heading-lg font-medium text-parchment tracking-tight">
            {t('stats.title')}
          </h2>
          <p className="text-body text-smoke leading-relaxed font-normal">{t('stats.subtitle')}</p>
        </div>

        {/* 4 Verified Stats Grid */}
        <div
          ref={statsGridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-stone/30"
        >
          <div className="space-y-3">
            <div className="text-display font-medium text-parchment leading-none tracking-tight">
              {t('stats.stat1.value')}
            </div>
            <div className="text-body font-medium text-parchment">{t('stats.stat1.label')}</div>
            <p className="text-caption text-smoke leading-relaxed">{t('stats.stat1.desc')}</p>
          </div>

          <div className="space-y-3">
            <div className="text-display font-medium text-parchment leading-none tracking-tight">
              {t('stats.stat2.value')}
            </div>
            <div className="text-body font-medium text-parchment">{t('stats.stat2.label')}</div>
            <p className="text-caption text-smoke leading-relaxed">{t('stats.stat2.desc')}</p>
          </div>

          <div className="space-y-3">
            <div className="text-display font-medium text-parchment leading-none tracking-tight">
              {t('stats.stat3.value')}
            </div>
            <div className="text-body font-medium text-parchment">{t('stats.stat3.label')}</div>
            <p className="text-caption text-smoke leading-relaxed">{t('stats.stat3.desc')}</p>
          </div>

          <div className="space-y-3">
            <div className="text-display font-medium text-parchment leading-none tracking-tight">
              {t('stats.stat4.value')}
            </div>
            <div className="text-body font-medium text-parchment">{t('stats.stat4.label')}</div>
            <p className="text-caption text-smoke leading-relaxed">{t('stats.stat4.desc')}</p>
          </div>
        </div>

        {/* Citations Footer */}
        <div className="pt-4 border-t border-stone/20 text-caption text-stone">
          {t('stats.sourceNote')}
        </div>
      </Card>
    </section>
  );
}
