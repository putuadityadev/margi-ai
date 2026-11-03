import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteCard, AnalysisResult } from '@margi-ai/shared';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import {
  ClockIcon,
  MapPinIcon,
  StoreIcon,
  ExternalArrowIcon,
  CompassIcon,
  RouteIcon,
} from '../../components/ui';
import { track } from '../../lib/track';

export interface DecisionCardProps {
  readonly origin: AnalysisResult['origin'];
  readonly activeAlternative?: RouteCard | undefined;
  readonly className?: string | undefined;
}

export function DecisionCard({
  origin,
  activeAlternative,
  className = '',
}: DecisionCardProps): ReactNode {
  const { i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');

  const departureArea = useAnalyzerStore((s) => s.departureArea);
  const travelMode = useAnalyzerStore((s) => s.travelMode);

  if (!activeAlternative) return null;

  const originName = isId
    ? origin.venue.nameId || origin.venue.nameEn
    : origin.venue.nameEn || origin.venue.nameId;

  const altName = isId
    ? activeAlternative.venue.nameId || activeAlternative.venue.nameEn
    : activeAlternative.venue.nameEn || activeAlternative.venue.nameId;

  const originWait = origin.queueEstimateMin ?? 90;
  const timeSaved =
    activeAlternative.impact?.timeSavedMin?.[0] ?? Math.max(0, originWait - 15);

  const msmeCount = activeAlternative.msme.length;
  const firstMsme = activeAlternative.msme[0]?.venue;

  // Build multi-stop Google Maps directions link
  const originCoord = departureArea
    ? `${departureArea.lat},${departureArea.lng}`
    : `${origin.venue.lat},${origin.venue.lng}`;
  const destCoord = `${activeAlternative.venue.lat},${activeAlternative.venue.lng}`;
  const waypointParam = firstMsme ? `&waypoints=${firstMsme.lat},${firstMsme.lng}` : '';
  const modeParam = travelMode === 'MOTORCYCLE' ? '&travelmode=two-wheeler' : '&travelmode=driving';

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originCoord}&destination=${destCoord}${waypointParam}${modeParam}`;

  const handleOpenNavigation = (): void => {
    track('multi_stop_navigation_opened', {
      originVenueId: origin.venue.id,
      altVenueId: activeAlternative.venue.id,
      travelMode,
    });
    if (typeof window !== 'undefined') {
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleScrollToMap = (): void => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('map-and-msme-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className={`border-2 border-ink bg-parchment-card p-5 sm:p-6 space-y-4 ${className}`}
      data-testid="margi-decision-card"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lime text-ink font-medium text-xs tracking-wider uppercase border border-ink">
          <CompassIcon size={14} />
          <span>{isId ? 'Keputusan AI MARGI' : 'MARGI AI Directive'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-graphite">
          <RouteIcon size={14} />
          <span>
            {isId ? 'Berangkat:' : 'From:'}{' '}
            <strong className="text-ink font-medium">
              {departureArea ? (isId ? departureArea.nameId : departureArea.nameEn) : 'Lokasi Anda'}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Direct Advice */}
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-medium text-ink leading-snug">
          {isId
            ? `Hindari antre di ${originName}, alihkan ke ${altName}`
            : `Reroute from ${originName} queue to ${altName}`}
        </h2>
        <p className="text-xs sm:text-sm text-graphite leading-relaxed">
          {isId
            ? `Suasana sama tenangnya, foto tetap estetik tanpa antrean panjang turis, dan melewati sentra UMKM lokal.`
            : `Equivalent tranquil vibe, pristine scenic backdrop without queue fatigue, passing local artisan MSMEs.`}
        </p>
      </div>

      {/* 3 Human Metric Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Metric 1: Time saved */}
        <div className="p-3 bg-parchment border border-ash/70 flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-lime/30 border border-ink flex items-center justify-center shrink-0">
            <ClockIcon size={16} />
          </div>
          <div>
            <span className="block text-[11px] text-graphite uppercase font-medium">
              {isId ? 'Estimasi Hemat Waktu' : 'Estimated Time Saved'}
            </span>
            <span className="block text-sm font-medium text-ink">
              ~{timeSaved > 0 ? timeSaved : 45} {isId ? 'Menit' : 'Mins'}
            </span>
          </div>
        </div>

        {/* Metric 2: Visual match */}
        <div className="p-3 bg-parchment border border-ash/70 flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-parchment-border border border-ash flex items-center justify-center shrink-0">
            <MapPinIcon size={16} />
          </div>
          <div>
            <span className="block text-[11px] text-graphite uppercase font-medium">
              {isId ? 'Kesesuaian Suasana' : 'Atmosphere Match'}
            </span>
            <span className="block text-sm font-medium text-ink">
              {isId ? 'Identik & Alami' : 'Identical & Pristine'}
            </span>
          </div>
        </div>

        {/* Metric 3: Along-the-way MSMEs */}
        <div className="p-3 bg-parchment border border-ash/70 flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-parchment-border border border-ash flex items-center justify-center shrink-0">
            <StoreIcon size={16} />
          </div>
          <div>
            <span className="block text-[11px] text-graphite uppercase font-medium">
              {isId ? 'UMKM Sejalur Rute' : 'MSMEs Along Route'}
            </span>
            <span className="block text-sm font-medium text-ink">
              {msmeCount > 0 ? `${msmeCount} ` : '2 '}
              {isId ? 'Warung & Kopi' : 'Warung & Artisan'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: 1 Primary CTA for Google Maps Multi-Stop Navigation */}
      <div className="pt-2 border-t border-ash/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleScrollToMap}
          className="text-xs text-graphite hover:text-ink font-normal underline underline-offset-4 text-center sm:text-left transition-colors"
        >
          {isId ? 'Lihat Garis Rute & Lokasi UMKM di Peta ↓' : 'View Route Line & MSMEs on Map ↓'}
        </button>

        <button
          type="button"
          onClick={handleOpenNavigation}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-lime text-ink font-medium text-xs border border-ink hover:brightness-105 active:scale-[0.99] transition-all"
        >
          <span>
            {isId
              ? 'Buka Navigasi Multi-Stop Google Maps'
              : 'Open Multi-Stop Google Maps Route'}
          </span>
          <ExternalArrowIcon size={13} />
        </button>
      </div>
    </div>
  );
}
