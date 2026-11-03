import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, SlidersIcon } from '../../components/ui';
import { PresetGrid } from './PresetGrid';
import { ImageDropzone } from './ImageDropzone';
import { OriginSelect } from './OriginSelect';
import { ArrivalTimePicker } from './ArrivalTimePicker';
import { SimulationToggle } from './SimulationToggle';
import { SavePhotoToggle } from './SavePhotoToggle';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { usePresets } from '../public/queries';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { track } from '../../lib/track';

export interface AnalyzerInputPanelProps {
  onAnalyze?: () => void;
  className?: string;
}

export function AnalyzerInputPanel({ onAnalyze, className }: AnalyzerInputPanelProps): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: presets = MOCK_PRESETS } = usePresets();

  const [showOptions, setShowOptions] = useState<boolean>(false);

  const presetId = useAnalyzerStore((s) => s.presetId);
  const file = useAnalyzerStore((s) => s.file);
  const simulate = useAnalyzerStore((s) => s.simulate);
  const isCompressing = useAnalyzerStore((s) => s.isCompressing);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const hasImageInput = Boolean(presetId || file);
  const canAnalyze = hasImageInput && !isCompressing;

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
    track('analysis_started', { presetId, hasCustomFile: Boolean(file) });
    onAnalyze?.();
  };

  return (
    <div className={className}>
      <Card tone="parchment" className="p-5 sm:p-7 border border-ash space-y-6">
        {/* 1. Primary Photo Upload */}
        <div className="space-y-2">
          <h2 className="text-body font-medium text-ink">{t('uploadTab')}</h2>
          <ImageDropzone />
        </div>

        {/* 2. Quick Sample Spots */}
        <div className="space-y-2.5 pt-4 border-t border-ash/70">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-graphite">{t('presetTab')}</span>
          </div>
          <PresetGrid />
        </div>

        {/* 3. Optional Time, Origin & Peak Simulation Settings */}
        <div className="pt-3 border-t border-ash/70 space-y-4">
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
              <span className="rounded-pill bg-white border border-ash px-2 py-0.5 text-[10px] text-ink">
                {isId ? 'Simulasi aktif' : 'Simulation on'}
              </span>
            ) : null}
          </button>

          {showOptions && (
            <div className="space-y-4 rounded-inner bg-white/80 p-4 border border-ash">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <OriginSelect />
                <ArrivalTimePicker />
              </div>

              <SimulationToggle />
              <SavePhotoToggle />
            </div>
          )}
        </div>

        {/* 4. Single Responsive Primary CTA */}
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
