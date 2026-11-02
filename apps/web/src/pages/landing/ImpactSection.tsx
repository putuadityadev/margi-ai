import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { gsap, useGSAP } from '../../lib/gsap';

export function ImpactSection(): ReactNode {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!gridRef.current || !sectionRef.current) return;

        gsap.from(gridRef.current.children, {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
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
    <section ref={sectionRef} className="py-16 md:py-24 border-t border-ash space-y-12">
      <div className="max-w-3xl space-y-4">
        <Pill tone="dark">{t('impact.eyebrow')}</Pill>
        <h2 className="text-heading md:text-heading-lg font-medium text-ink tracking-tight">
          {t('impact.title')}
        </h2>
        <p className="text-body text-graphite leading-relaxed font-normal">
          {t('impact.subtitle')}
        </p>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card tone="white" className="p-8 space-y-4">
          <div className="text-subheading font-medium text-ink">01</div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('impact.pillar1Title')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">{t('impact.pillar1Desc')}</p>
        </Card>

        <Card tone="white" className="p-8 space-y-4">
          <div className="text-subheading font-medium text-ink">02</div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('impact.pillar2Title')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">{t('impact.pillar2Desc')}</p>
        </Card>

        <Card tone="white" className="p-8 space-y-4">
          <div className="text-subheading font-medium text-ink">03</div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('impact.pillar3Title')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">{t('impact.pillar3Desc')}</p>
        </Card>
      </div>
    </section>
  );
}
