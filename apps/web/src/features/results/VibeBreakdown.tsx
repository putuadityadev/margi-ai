import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { VibeDimension, VibeProfile } from '@margi-ai/shared';
import { useStreamStore } from '../../stores/streamStore';
import { useAnalyzerStore } from '../../stores/analyzerStore';

export interface VibeBreakdownProps {
  readonly vibe?: VibeProfile | null;
  readonly referenceImageUrl?: string | null;
  readonly className?: string;
}

interface DimensionRowProps {
  readonly label: string;
  readonly dimension: VibeDimension;
}

function DimensionRow({ label, dimension }: DimensionRowProps): ReactNode {
  const pct = Math.round(dimension.intensity * 100);

  return (
    <div
      className="space-y-1.5 py-2.5 border-b border-ash/50 last:border-b-0"
      data-testid="vibe-dimension-row"
    >
      <div className="flex items-center justify-between text-xs font-normal">
        <span className="text-ink font-medium">{label}</span>
        <span className="font-mono text-stone tabular-nums">{pct}%</span>
      </div>

      {/* Accessible ink-on-parchment intensity bar */}
      <div
        className="h-2 w-full bg-parchment rounded-pill overflow-hidden border border-ash/60"
        role="meter"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-ink rounded-pill transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Descriptor chips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[11px] font-mono text-graphite">{dimension.label} ·</span>
        {dimension.descriptors.map((desc) => (
          <span
            key={desc}
            className="px-2 py-0.5 rounded-inner bg-parchment text-ink border border-ash/80 text-[11px] font-normal"
          >
            {desc}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VibeBreakdown({
  vibe: propVibe,
  referenceImageUrl: propImg,
  className = '',
}: VibeBreakdownProps): ReactNode {
  const { t } = useTranslation('results');
  const storeVibe = useStreamStore((s) => s.sections.vibe);
  const storeResult = useStreamStore((s) => s.result);
  const analyzerPreview = useAnalyzerStore((s) => s.previewUrl);

  const vibe = propVibe ?? storeVibe ?? storeResult?.vibe;
  const imageUrl =
    propImg ??
    analyzerPreview ??
    storeResult?.input.origin.imageUrl ??
    '/images/presets/lempuyang.webp';

  if (!vibe) {
    return (
      <section
        aria-label="Vibe Breakdown"
        className={`bg-white rounded-card border border-ash p-6 md:p-8 min-h-[420px] flex flex-col justify-between animate-pulse ${className}`}
        data-testid="vibe-breakdown-skeleton"
      >
        <div className="space-y-3">
          <div className="h-6 w-1/3 bg-ash/40 rounded-inner" />
          <div className="h-4 w-2/3 bg-ash/25 rounded-inner" />
        </div>
        <div className="space-y-4 my-6">
          <div className="h-8 bg-ash/20 rounded-inner w-full" />
          <div className="h-8 bg-ash/20 rounded-inner w-full" />
          <div className="h-8 bg-ash/20 rounded-inner w-full" />
          <div className="h-8 bg-ash/20 rounded-inner w-full" />
          <div className="h-8 bg-ash/20 rounded-inner w-full" />
        </div>
        <div className="h-4 w-1/4 bg-ash/30 rounded-inner" />
      </section>
    );
  }

  const confidencePct = Math.round(vibe.confidence * 100);

  return (
    <section
      aria-label="Atmosphere & Vibe Breakdown"
      data-testid="vibe-breakdown"
      className={`bg-white rounded-card border border-ash p-6 md:p-8 min-h-[420px] transition-colors ${className}`}
    >
      {/* Eyebrow & Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-subheading text-ink font-medium leading-tight">
            {t('vibeBreakdown.title', 'Atmosphere & Vibe Breakdown')}
          </h3>
          <p className="text-xs text-graphite font-normal mt-0.5">
            {t(
              'vibeBreakdown.subtitle',
              'Visual features deconstructed by Agent 1 from your reference scene',
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-parchment border border-ash text-xs font-mono text-graphite">
          <span>{t('vibeBreakdown.confidence', 'AI Confidence')}:</span>
          <strong className="text-ink font-medium tabular-nums">{confidencePct}%</strong>
        </div>
      </div>

      {/* Main Grid: Reference Image + 5 Dimension Rows */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-4">
        {/* Reference Image Thumbnail & Scene Summary */}
        <div className="md:col-span-4 space-y-3">
          <div className="aspect-[4/3] rounded-inner overflow-hidden border border-ash bg-parchment relative">
            <img
              src={imageUrl}
              alt={t('vibeBreakdown.referencePhoto', 'Reference Scene')}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <p className="text-xs text-graphite font-normal italic leading-relaxed border-l-2 border-stone pl-3">
            "{vibe.sceneSummary}"
          </p>

          {vibe.detectedLandmarkGuess ? (
            <div className="text-[11px] font-mono text-stone">
              Detected signature:{' '}
              <strong className="text-ink font-normal">{vibe.detectedLandmarkGuess}</strong>
            </div>
          ) : null}
        </div>

        {/* 5 Rows with Accessible Intensity Meters */}
        <div className="md:col-span-8 bg-white space-y-1">
          <DimensionRow
            label={t('vibeBreakdown.topography', 'Topography & Landform')}
            dimension={vibe.topography}
          />
          <DimensionRow
            label={t('vibeBreakdown.architecture', 'Architecture & Built Heritage')}
            dimension={vibe.architecture}
          />
          <DimensionRow
            label={t('vibeBreakdown.lighting', 'Lighting & Atmosphere')}
            dimension={vibe.lighting}
          />
          <DimensionRow
            label={t('vibeBreakdown.activity', 'Activity & Energy')}
            dimension={vibe.activity}
          />
          <DimensionRow
            label={t('vibeBreakdown.visualDensity', 'Visual Density & Composition')}
            dimension={vibe.visualDensity}
          />
        </div>
      </div>
    </section>
  );
}
