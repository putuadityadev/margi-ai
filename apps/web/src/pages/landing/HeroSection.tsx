import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PresetCard, type PresetCardItem } from './PresetCard';
import { ImageDropzone } from '../../features/analyzer/ImageDropzone';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { useStreamStore } from '../../stores/streamStore';
import { gsap, useGSAP } from '../../lib/gsap';

export const DEFAULT_PRESET_ITEMS: PresetCardItem[] = [
  {
    id: 'lempuyang-morning',
    titleEn: 'Gates of Heaven — Pura Lempuyang',
    titleId: 'Gerbang Surga — Pura Lempuyang',
    subtitleEn: 'Iconic mountain split gate framing Mount Agung in crisp morning light',
    subtitleId: 'Gerbang Candi Bentar ikonis dengan latar Gunung Agung di pagi hari',
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
    subtitleEn: 'Serene lakeside pagoda surrounded by Bedugul mountain mist',
    subtitleId: 'Pura tepi Danau Beratan dengan kabut sejuk dataran tinggi Bedugul',
    imageUrl: '/presets/ulundanu.webp',
    regencyEn: 'Tabanan',
    regencyId: 'Tabanan',
    queueEn: '1.5 – 2.5 hrs wait',
    queueId: 'Antre 1,5 – 2,5 jam',
  },
  {
    id: 'tegallalang-terrace',
    titleEn: 'Emerald Steps — Tegallalang Rice Terrace',
    titleId: 'Hamparan Sawah — Terasering Tegallalang',
    subtitleEn: 'Lush valley rice terraces sculpted along Gianyar hills',
    subtitleId: 'Lembah sawah bertingkat hijau yang sejuk di perbukitan Gianyar',
    imageUrl: '/presets/tegallalang.webp',
    regencyEn: 'Gianyar',
    regencyId: 'Gianyar',
    queueEn: '1 – 2 hrs wait',
    queueId: 'Antre 1 – 2 jam',
  },
  {
    id: 'tanah-lot-sunset',
    titleEn: 'Ocean Sunset Sanctuary — Tanah Lot',
    titleId: 'Pura Karang Laut — Tanah Lot',
    subtitleEn: 'Sea temple perched over Indian Ocean sunset waves',
    subtitleId: 'Pura di atas batu karang tepi samudra saat matahari terbenam',
    imageUrl: '/presets/tanahlot.webp',
    regencyEn: 'Tabanan',
    regencyId: 'Tabanan',
    queueEn: '2 – 3 hrs wait',
    queueId: 'Antre 2 – 3 jam',
  },
];

export function HeroSection(): ReactNode {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const resetStream = useStreamStore((s) => s.reset);
  const resetAnalyzer = useAnalyzerStore((s) => s.reset);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resetAnalyzer();
    resetStream();
  }, [resetAnalyzer, resetStream]);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-item]', {
          y: 16,
          opacity: 0,
          stagger: 0.08,
          duration: 0.45,
          ease: 'power2.out',
        });
      });
    },
    { scope: containerRef },
  );

  const handlePhotoUploaded = (): void => {
    resetStream();
    void navigate('/app?run=1');
  };

  return (
    <section ref={containerRef} className="py-6 sm:py-10 space-y-8">
      {/* Clean Mobile-First Headline */}
      <div data-hero-item className="space-y-2.5 text-center sm:text-left">
        <h1 className="text-heading sm:text-[40px] font-medium text-ink leading-[1.08] tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="text-body-sm sm:text-body text-graphite font-normal leading-relaxed">
          {t('hero.subtitle')}
        </p>
      </div>

      {/* Seamless Step 1: Upload Photo Right Away */}
      <div data-hero-item>
        <ImageDropzone onFileAccepted={handlePhotoUploaded} />
      </div>

      {/* Or 1-Tap Popular Sample Spots */}
      <div id="presets" data-hero-item className="space-y-3.5 pt-2">
        <h2 className="text-body-sm font-medium text-graphite">
          {t('hero.presetSectionTitle')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {DEFAULT_PRESET_ITEMS.map((preset, index) => (
            <PresetCard key={preset.id} preset={preset} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
