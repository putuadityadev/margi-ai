import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  SlidersIcon,
  SearchIcon,
  CameraIcon,
  ShareLinkIcon,
  MotorcycleIcon,
  CarIcon,
} from '../../components/ui';
import { DestinationSearch } from './DestinationSearch';
import { SocialLinkInput } from './SocialLinkInput';
import { PresetGrid } from './PresetGrid';
import { ImageDropzone } from './ImageDropzone';
import { OriginSelect } from './OriginSelect';
import { ArrivalTimePicker } from './ArrivalTimePicker';
import { SimulationToggle } from './SimulationToggle';
import { SavePhotoToggle } from './SavePhotoToggle';
import { useAnalyzerStore, type TravelMode } from '../../stores/analyzerStore';
import { usePresets } from '../public/queries';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { track } from '../../lib/track';

export interface AnalyzerInputPanelProps {
  onAnalyze?: () => void;
  className?: string;
}

type InputMethodTab = 'search' | 'upload' | 'link';

export function AnalyzerInputPanel({ onAnalyze, className }: AnalyzerInputPanelProps): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: presets = MOCK_PRESETS } = usePresets();

  const [activeTab, setActiveTab] = useState<InputMethodTab>('upload');
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const presetId = useAnalyzerStore((s) => s.presetId);
  const file = useAnalyzerStore((s) => s.file);
  const destinationVenueId = useAnalyzerStore((s) => s.destinationVenueId);
  const originVenueId = useAnalyzerStore((s) => s.originVenueId);
  const travelMode = useAnalyzerStore((s) => s.travelMode);
  const setTravelMode = useAnalyzerStore((s) => s.setTravelMode);
  const simulate = useAnalyzerStore((s) => s.simulate);
  const isCompressing = useAnalyzerStore((s) => s.isCompressing);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const hasValidInput = Boolean(presetId || file || destinationVenueId || originVenueId);
  const canAnalyze = hasValidInput && !isCompressing;

  // Handle ?preset={id}&run=1 or ?run=1 (when file was uploaded on landing page)
  const autoRunHandledRef = useRef(false);

  useEffect(() => {
    const presetParam = searchParams.get('preset');
    const runParam = searchParams.get('run');

    if (presetParam && presets.length > 0) {
      const matched = presets.find((p) => p.id === presetParam);
      if (matched && presetId !== matched.id) {
        setPreset(matched);
      }
    }

    if (runParam === '1' && !autoRunHandledRef.current && (presetParam || file || presetId)) {
      autoRunHandledRef.current = true;
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('run');
      setSearchParams(newParams, { replace: true });

      track('analysis_started', {
        presetId: presetParam ?? presetId,
        hasCustomFile: Boolean(file),
        autoRun: true,
      });
      onAnalyze?.();
    }
  }, [presets, searchParams, setSearchParams, presetId, file, setPreset, onAnalyze]);

  const handleSubmit = (): void => {
    if (!canAnalyze) return;
    track('analysis_started', { presetId, hasCustomFile: Boolean(file), destinationVenueId });
    onAnalyze?.();
  };

  return (
    <div className={className}>
      <Card tone="parchment" className="p-5 sm:p-7 border border-ash space-y-6">
        {/* Crisp Swiss Segmented Mode Switcher */}
        <div className="grid grid-cols-3 border border-ash/80 bg-parchment p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-ink text-parchment border border-ink'
                : 'bg-transparent text-graphite hover:text-ink border border-transparent'
            }`}
          >
            <CameraIcon size={14} className="shrink-0" />
            <span className="truncate">{isId ? 'Unggah' : 'Upload'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-ink text-parchment border border-ink'
                : 'bg-transparent text-graphite hover:text-ink border border-transparent'
            }`}
          >
            <SearchIcon size={14} className="shrink-0" />
            <span className="truncate">{isId ? 'Cari' : 'Search'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 text-xs font-medium transition-colors ${
              activeTab === 'link'
                ? 'bg-ink text-parchment border border-ink'
                : 'bg-transparent text-graphite hover:text-ink border border-transparent'
            }`}
          >
            <ShareLinkIcon size={14} className="shrink-0" />
            <span className="truncate">{isId ? 'Tautan' : 'Link'}</span>
          </button>
        </div>

        {/* Tab 1: Upload Dropzone */}
        {activeTab === 'upload' && (
          <div className="space-y-2">
            <ImageDropzone />
          </div>
        )}

        {/* Tab 2: Destination Search */}
        {activeTab === 'search' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-graphite uppercase tracking-wider">
              {isId ? 'Cari Tempat Wisata Bali' : 'Search Bali Destination'}
            </label>
            <DestinationSearch />
          </div>
        )}

        {/* Tab 3: Social Link */}
        {activeTab === 'link' && (
          <div className="space-y-2">
            <SocialLinkInput />
          </div>
        )}

        {/* Quick Sample Spots (Always accessible) */}
        <div className="space-y-2.5 pt-4 border-t border-ash/70">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-graphite">{t('presetTab')}</span>
          </div>
          <PresetGrid />
        </div>

        {/* Travel Mode Quick Selector */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-ash/70 flex-wrap">
          <span className="text-xs font-medium text-graphite">
            {isId ? 'Moda Transportasi:' : 'Travel Mode:'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTravelMode('MOTORCYCLE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                travelMode === 'MOTORCYCLE'
                  ? 'border-ink bg-ink text-parchment font-medium'
                  : 'border-ash bg-parchment hover:bg-parchment-border text-ink'
              }`}
            >
              <MotorcycleIcon size={14} />
              <span>{isId ? 'Motor' : 'Motorcycle'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('CAR')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                travelMode === 'CAR'
                  ? 'border-ink bg-ink text-parchment font-medium'
                  : 'border-ash bg-parchment hover:bg-parchment-border text-ink'
              }`}
            >
              <CarIcon size={14} />
              <span>{isId ? 'Mobil' : 'Car'}</span>
            </button>
          </div>
        </div>

        {/* Optional Time, Origin & Peak Simulation Settings */}
        <div className="pt-2 border-t border-ash/70 space-y-4">
          <button
            type="button"
            onClick={() => setShowOptions((prev) => !prev)}
            aria-expanded={showOptions}
            data-testid="toggle-options-button"
            className="inline-flex items-center gap-2 text-xs font-medium text-graphite hover:text-ink transition cursor-pointer"
          >
            <SlidersIcon size={15} />
            <span>
              {isId
                ? 'Atur jam datang, lokasi & simulasi (opsional)'
                : 'Adjust arrival time, area & simulation (optional)'}
            </span>
            {simulate ? (
              <span className="rounded-none bg-white border border-ash px-2 py-0.5 text-[10px] text-ink">
                {isId ? 'Simulasi aktif' : 'Simulation on'}
              </span>
            ) : null}
          </button>

          {showOptions && (
            <div className="space-y-4 rounded-none bg-white/80 p-4 border border-ash">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <OriginSelect />
                <ArrivalTimePicker />
              </div>

              <SimulationToggle />
              <SavePhotoToggle />
            </div>
          )}
        </div>

        {/* Single Responsive Primary CTA */}
        <div className="sticky bottom-3 z-20 sm:static bg-parchment/95 sm:bg-transparent pt-2 flex flex-col items-stretch sm:items-end gap-1.5">
          <Button
            variant="primary"
            size="lg"
            disabled={!canAnalyze}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-8 py-3.5 text-base"
          >
            <span>{t('analyzeButton')}</span>
            <span aria-hidden="true">→</span>
          </Button>

          {!canAnalyze && (
            <p className="text-center sm:text-right text-xs text-graphite font-normal" role="status">
              {t('ctaDisabledHelper')}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
