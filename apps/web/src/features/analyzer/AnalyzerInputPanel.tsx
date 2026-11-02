import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Tabs, TabList, TabTrigger, TabContent } from '../../components/ui';
import { PresetGrid } from './PresetGrid';
import { ImageDropzone } from './ImageDropzone';
import { OriginSelect } from './OriginSelect';
import { ArrivalTimePicker } from './ArrivalTimePicker';
import { SimulationToggle } from './SimulationToggle';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { usePresets } from '../public/queries';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { track } from '../../lib/track';

export interface AnalyzerInputPanelProps {
  onAnalyze?: () => void;
  className?: string;
}

export function AnalyzerInputPanel({ onAnalyze, className }: AnalyzerInputPanelProps): ReactNode {
  const { t } = useTranslation('analyzer');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: presets = MOCK_PRESETS } = usePresets();

  const [userTab, setUserTab] = useState<'preset' | 'upload' | null>(null);

  const presetId = useAnalyzerStore((s) => s.presetId);
  const file = useAnalyzerStore((s) => s.file);
  const isCompressing = useAnalyzerStore((s) => s.isCompressing);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const activeTab = userTab ?? (file && !presetId ? 'upload' : 'preset');

  const hasImageInput = Boolean(presetId || file);
  const canAnalyze = hasImageInput && !isCompressing;

  // Handle ?preset={id}&run=1 from landing page preset click
  const autoRunHandledRef = useRef(false);

  useEffect(() => {
    const presetParam = searchParams.get('preset');
    const runParam = searchParams.get('run');

    if (presetParam && presets.length > 0) {
      const matched = presets.find((p) => p.id === presetParam);
      if (matched && presetId !== matched.id) {
        setPreset(matched);
      }

      if (runParam === '1' && !autoRunHandledRef.current) {
        autoRunHandledRef.current = true;
        // Clean up 'run' from search params without full page reload
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('run');
        setSearchParams(newParams, { replace: true });

        track('analysis_started', { presetId: presetParam, autoRun: true });
        onAnalyze?.();
      }
    }
  }, [presets, searchParams, setSearchParams, presetId, setPreset, onAnalyze]);

  const handleSubmit = (): void => {
    if (!canAnalyze) return;
    track('analysis_started', { presetId, hasCustomFile: Boolean(file) });
    onAnalyze?.();
  };

  return (
    <div className={className}>
      <Card tone="parchment" className="p-6 md:p-10 border border-ash space-y-8">
        {/* Step 1: Input Image / Preset Selection */}
        <Tabs value={activeTab} onChange={(val) => setUserTab(val as 'preset' | 'upload')}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ash pb-3">
            <div>
              <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                Step 1 · Scene Source
              </span>
              <h3 className="text-subheading font-medium text-ink">{t('visualReference')}</h3>
            </div>

            <TabList aria-label="Input mode">
              <TabTrigger value="preset">{t('presetTab')}</TabTrigger>
              <TabTrigger value="upload">{t('uploadTab')}</TabTrigger>
            </TabList>
          </div>

          <TabContent value="preset">
            <PresetGrid />
          </TabContent>
          <TabContent value="upload">
            <ImageDropzone />
          </TabContent>
        </Tabs>

        {/* Step 2: Parameters (Origin, Arrival WITA, Simulation) */}
        <div className="space-y-6 pt-4 border-t border-ash">
          <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
            Step 2 · Spatiotemporal Context
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OriginSelect />
            <ArrivalTimePicker />
          </div>

          <SimulationToggle />
        </div>

        {/* Step 3: Desktop CTA */}
        <div className="pt-4 border-t border-ash hidden md:flex flex-col items-end gap-2">
          <Button
            variant="primary"
            size="lg"
            disabled={!canAnalyze}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-10 py-4 text-base"
          >
            {t('analyzeButton')}
            <span aria-hidden="true">→</span>
          </Button>

          {!canAnalyze && (
            <p className="text-xs text-graphite font-normal" role="status">
              {t('ctaDisabledHelper')}
            </p>
          )}
        </div>
      </Card>

      {/* Mobile Sticky CTA Bar (PRD AC-09.4) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-4 bg-white/95 backdrop-blur-md border-t border-ash flex flex-col gap-1.5 safe-area-pb">
        <Button
          variant="primary"
          size="lg"
          disabled={!canAnalyze}
          onClick={handleSubmit}
          className="w-full py-4 text-base"
        >
          {t('analyzeButton')}
          <span aria-hidden="true">→</span>
        </Button>
        {!canAnalyze && (
          <p className="text-center text-[11px] text-graphite font-normal">
            {t('ctaDisabledHelper')}
          </p>
        )}
      </div>
    </div>
  );
}
