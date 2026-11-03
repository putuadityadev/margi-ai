import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePresets } from '../public/queries';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_PRESETS, EXTRA_POPULAR_PRESET } from '../../mocks/data/presets';
import { GlassyCarousel, type GlassyCarouselItem } from '../../components/ui/glassy-coverflow-carousel';
import { Film } from 'lucide-react';

export interface PresetGridProps {
  readonly onSelectPreset?: (presetId: string) => void;
  readonly className?: string;
}

export function PresetGrid({ onSelectPreset, className = '' }: PresetGridProps): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const { data: presets = MOCK_PRESETS } = usePresets();

  const allPresets = [
    ...presets,
    ...(presets.some((p) => p.id === EXTRA_POPULAR_PRESET.id) ? [] : [EXTRA_POPULAR_PRESET]),
  ];

  const selectedPresetId = useAnalyzerStore((s) => s.presetId);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const carouselItems: GlassyCarouselItem[] = allPresets.map((p) => ({
    id: p.id,
    title: isId ? p.titleId : p.titleEn,
    subtitle: isId ? p.subtitleId : p.subtitleEn,
    image: p.imageUrl,
    tag: p.id.includes('lempuyang') || p.id.includes('ulundanu') || p.id.includes('tanah')
      ? 'PURA'
      : p.id.includes('tegallalang')
        ? 'TERASERING'
        : 'PANTAI',
    bEff: p.id.includes('lempuyang')
      ? 95
      : p.id.includes('kelingking')
        ? 96
        : p.id.includes('tanah')
          ? 92
          : p.id.includes('tegallalang')
            ? 88
            : 82,
    description: isId ? p.subtitleId : p.subtitleEn,
  }));

  const initialIndex = Math.max(
    0,
    allPresets.findIndex((p) => p.id === selectedPresetId),
  );

  const handleSelectItem = (item: GlassyCarouselItem): void => {
    const matched = allPresets.find((p) => p.id === item.id);
    if (matched) {
      setPreset(matched);
      onSelectPreset?.(matched.id);
    }
  };

  const handleAction = (item: GlassyCarouselItem): void => {
    handleSelectItem(item);
  };

  return (
    <div className={`space-y-3 ${className}`} data-testid="preset-grid">
      {/* Header bar with link to TikTok/Reels feed */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-medium uppercase tracking-wider text-graphite">
          {isId ? '5 Destinasi Populer Bali' : '5 Top Bali Presets'}
        </span>
        <Link
          to="/feed"
          className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline font-medium cursor-pointer"
        >
          <Film size={13} className="text-lime-dark" />
          <span>{isId ? 'Buka Mode Reels / Feed (Lihat Semua) →' : 'Open Reels Mode (See All) →'}</span>
        </Link>
      </div>

      {/* 3D Coverflow Carousel */}
      <GlassyCarousel
        items={carouselItems}
        initialIndex={initialIndex}
        layout="website"
        onSelect={handleSelectItem}
        onAction={handleAction}
        actionLabel={isId ? '✦ Pilih Tempat Ini' : '✦ Select This Spot'}
        className="w-full"
      />
    </div>
  );
}

export default PresetGrid;
