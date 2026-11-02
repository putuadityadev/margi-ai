import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { gsap, useGSAP } from '../../lib/gsap';

export function HowAgentsWorkSection(): ReactNode {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!cardsGridRef.current || !sectionRef.current) return;

        gsap.from(cardsGridRef.current.children, {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
          y: 30,
          opacity: 0,
          stagger: 0.12,
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
        <Pill tone="dark">{t('agents.eyebrow')}</Pill>
        <h2 className="text-heading md:text-heading-lg font-medium text-ink tracking-tight">
          {t('agents.title')}
        </h2>
        <p className="text-body text-graphite leading-relaxed font-normal">
          {t('agents.subtitle')}
        </p>
      </div>

      <div ref={cardsGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent 1 */}
        <Card tone="parchment" className="p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                {t('agents.agent1.badge')}
              </span>
              <Pill tone="default">{t('agents.agent1.model')}</Pill>
            </div>
            <h3 className="text-subheading font-medium text-ink tracking-tight">
              {t('agents.agent1.name')}
            </h3>
            <p className="text-body-sm text-graphite leading-relaxed">{t('agents.agent1.desc')}</p>
          </div>

          <div className="pt-4 border-t border-ash/60 space-y-2">
            <span className="text-caption text-graphite font-medium uppercase tracking-[0.1em]">
              5 Vector Dimensions
            </span>
            <div className="flex flex-wrap gap-1.5 text-caption text-ink font-medium">
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Topography
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Architecture
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Lighting
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Activity
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">Density</span>
            </div>
          </div>
        </Card>

        {/* Agent 2 */}
        <Card tone="white" className="p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                {t('agents.agent2.badge')}
              </span>
              <Pill tone="default">{t('agents.agent2.model')}</Pill>
            </div>
            <h3 className="text-subheading font-medium text-ink tracking-tight">
              {t('agents.agent2.name')}
            </h3>
            <p className="text-body-sm text-graphite leading-relaxed">{t('agents.agent2.desc')}</p>
          </div>

          <div className="pt-4 border-t border-ash/60 space-y-2">
            <span className="text-caption text-graphite font-medium uppercase tracking-[0.1em]">
              CFS & 3-Tier Fallback
            </span>
            <div className="flex flex-wrap gap-1.5 text-caption text-ink font-medium">
              <span className="bg-parchment px-2 py-1 rounded-inner border border-ash/50">
                1. Live Signal
              </span>
              <span className="bg-parchment px-2 py-1 rounded-inner border border-ash/50">
                2. 7x24 Forecast
              </span>
              <span className="bg-parchment px-2 py-1 rounded-inner border border-ash/50">
                3. Simulation
              </span>
            </div>
          </div>
        </Card>

        {/* Agent 3 */}
        <Card tone="parchment" className="p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                {t('agents.agent3.badge')}
              </span>
              <Pill tone="default">{t('agents.agent3.model')}</Pill>
            </div>
            <h3 className="text-subheading font-medium text-ink tracking-tight">
              {t('agents.agent3.name')}
            </h3>
            <p className="text-body-sm text-graphite leading-relaxed">{t('agents.agent3.desc')}</p>
          </div>

          <div className="pt-4 border-t border-ash/60 space-y-2">
            <span className="text-caption text-graphite font-medium uppercase tracking-[0.1em]">
              Output Pipeline
            </span>
            <div className="flex flex-wrap gap-1.5 text-caption text-ink font-medium">
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Micro 1–3 km
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Regional
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                MSME Bundles
              </span>
              <span className="bg-white px-2 py-1 rounded-inner border border-ash/50">
                Adat Etiquette
              </span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
