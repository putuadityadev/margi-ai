import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Pill } from '../../components/ui';
import { PresetCard, type PresetCardItem } from './PresetCard';
import { gsap, SplitText, useGSAP } from '../../lib/gsap';

export const DEFAULT_PRESET_ITEMS: PresetCardItem[] = [
  {
    id: 'lempuyang-morning',
    titleEn: 'Gates of Heaven — Pura Lempuyang',
    titleId: 'Gerbang Surga — Pura Lempuyang',
    subtitleEn: 'Iconic mountain split gate framing Mount Agung in crisp morning light',
    subtitleId: 'Gerbang Candi Bentar ikonis dengan latar Gunung Agung di pagi hari yang cerah',
    imageUrl: '/presets/lempuyang.webp',
    regencyEn: 'Karangasem',
    regencyId: 'Karangasem',
    queueEn: '2.5 – 4 hrs wait',
    queueId: 'Antre 2,5 – 4 jam',
  },
  {
    id: 'ulun-danu-lake',
    titleEn: 'Floating Temple — Ulun Danu Beratan',
    titleId: 'Pura Terapung — Ulun Danu Beratan',
    subtitleEn: 'Serene lakeside pagoda surrounded by Bedugul highland mountain mist',
    subtitleId: 'Pura air di tepi Danau Beratan dengan kabut sejuk dataran tinggi Bedugul',
    imageUrl: '/presets/ulundanu.webp',
    regencyEn: 'Tabanan',
    regencyId: 'Tabanan',
    queueEn: '1.5 – 2.5 hrs wait',
    queueId: 'Antre 1,5 – 2,5 jam',
  },
  {
    id: 'tegallalang-terrace',
    titleEn: 'Emerald Steps — Tegallalang Rice Terrace',
    titleId: 'Hamparan Zamrud — Terasering Tegallalang',
    subtitleEn: 'Steep lush valley terraces sculpted with centuries-old Subak craftsmanship',
    subtitleId: 'Lembah terasering sawah hijau bertingkat dengan sistem irigasi warisan Subak',
    imageUrl: '/presets/tegallalang.webp',
    regencyEn: 'Gianyar',
    regencyId: 'Gianyar',
    queueEn: '1 – 2 hrs wait',
    queueId: 'Antre 1 – 2 jam',
  },
  {
    id: 'tanah-lot-sunset',
    titleEn: 'Ocean Sunset Sanctuary — Tanah Lot',
    titleId: 'Pura Karang Samudra — Tanah Lot',
    subtitleEn: 'Dramatically perched sea temple against the crashing waves of the Indian Ocean',
    subtitleId: 'Pura di atas batu karang laut lepas dengan siluet matahari terbenam yang dramatis',
    imageUrl: '/presets/tanahlot.webp',
    regencyEn: 'Tabanan',
    regencyId: 'Tabanan',
    queueEn: '2 – 3 hrs wait',
    queueId: 'Antre 2 – 3 jam',
  },
];

export function HeroSection(): ReactNode {
  const { t } = useTranslation('landing');
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaGroupRef = useRef<HTMLDivElement>(null);
  const presetGridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        let split: SplitText | null = null;
        try {
          if (headlineRef.current) {
            split = new SplitText(headlineRef.current, { type: 'lines,words' });
            gsap.from(split.words, {
              y: 24,
              opacity: 0,
              stagger: 0.03,
              duration: 0.7,
              ease: 'power2.out',
            });
          }
        } catch {
          // Fallback if SplitText cannot parse DOM
          if (headlineRef.current) {
            gsap.from(headlineRef.current, {
              y: 20,
              opacity: 0,
              duration: 0.6,
              ease: 'power2.out',
            });
          }
        }

        if (subtitleRef.current) {
          gsap.from(subtitleRef.current, {
            y: 16,
            opacity: 0,
            duration: 0.6,
            delay: 0.2,
            ease: 'power2.out',
          });
        }

        if (ctaGroupRef.current) {
          gsap.from(ctaGroupRef.current, {
            y: 16,
            opacity: 0,
            duration: 0.6,
            delay: 0.35,
            ease: 'power2.out',
          });
        }

        if (presetGridRef.current) {
          gsap.from(presetGridRef.current.children, {
            y: 28,
            opacity: 0,
            stagger: 0.08,
            duration: 0.65,
            delay: 0.45,
            ease: 'power2.out',
          });
        }

        return () => {
          if (split) {
            split.revert();
          }
        };
      });
    },
    { scope: containerRef },
  );

  return (
    <section ref={containerRef} className="pt-8 md:pt-16 pb-16 md:pb-24">
      {/* Editorial Headline & Sub-copy */}
      <div className="max-w-4xl space-y-6">
        <Pill tone="dark">{t('hero.eyebrow')}</Pill>
        <h1
          ref={headlineRef}
          className="text-heading-lg md:text-display font-medium text-ink leading-[0.9] tracking-tight"
        >
          {t('hero.title')}
        </h1>
        <p
          ref={subtitleRef}
          className="text-body md:text-subheading text-graphite font-normal max-w-2xl leading-relaxed"
        >
          {t('hero.subtitle')}
        </p>
        <div ref={ctaGroupRef} className="pt-2 flex flex-wrap items-center gap-4">
          <Link to="/app">
            <Button variant="primary" size="lg" className="px-8 py-4 text-base">
              {t('hero.cta')}
              <span aria-hidden="true">→</span>
            </Button>
          </Link>
          <a href="#presets">
            <Button variant="ghost" size="lg" className="text-base text-graphite hover:text-ink">
              {t('hero.secondaryCta')}
            </Button>
          </a>
        </div>
      </div>

      {/* 4 Quick Preset Cards */}
      <div id="presets" className="mt-16 md:mt-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-ash pb-4">
          <h2 className="text-subheading font-medium text-ink tracking-tight">
            {t('hero.presetSectionTitle')}
          </h2>
          <span className="text-xs font-medium text-graphite uppercase tracking-[0.1em]">
            1-Click Analysis · Live Telemetry
          </span>
        </div>

        <div ref={presetGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEFAULT_PRESET_ITEMS.map((preset, index) => (
            <PresetCard key={preset.id} preset={preset} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
