import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { gsap, useGSAP } from '../../lib/gsap';

export function ResponsibleAiSection(): ReactNode {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-4">
          <Pill tone="dark">{t('responsible.eyebrow')}</Pill>
          <h2 className="text-heading md:text-heading-lg font-medium text-ink tracking-tight">
            {t('responsible.title')}
          </h2>
        </div>
        <Link
          to="/about/ai-disclosure"
          className="text-sm font-medium text-ink underline underline-offset-4 hover:text-graphite transition-colors inline-flex items-center gap-1 shrink-0"
        >
          View Full AI Disclosure
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card tone="parchment" className="p-8 space-y-4 border border-ash">
          <div className="text-eyebrow font-medium text-graphite uppercase tracking-[0.1em]">
            Privacy & Security
          </div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('responsible.privacyTitle')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">
            {t('responsible.privacyDesc')}
          </p>
        </Card>

        <Card tone="parchment" className="p-8 space-y-4 border border-ash">
          <div className="text-eyebrow font-medium text-graphite uppercase tracking-[0.1em]">
            Tri Hita Karana & Adat
          </div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('responsible.cultureTitle')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">
            {t('responsible.cultureDesc')}
          </p>
        </Card>

        <Card tone="parchment" className="p-8 space-y-4 border border-ash">
          <div className="text-eyebrow font-medium text-graphite uppercase tracking-[0.1em]">
            Full Transparency
          </div>
          <h3 className="text-subheading font-medium text-ink tracking-tight">
            {t('responsible.glassBoxTitle')}
          </h3>
          <p className="text-body-sm text-graphite leading-relaxed">
            {t('responsible.glassBoxDesc')}
          </p>
        </Card>
      </div>
    </section>
  );
}
