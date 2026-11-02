import { type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { usePresets } from '../public/queries';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { cn } from '../../lib/cn';

export function PresetGrid(): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const { data: presets = MOCK_PRESETS } = usePresets();

  const selectedPresetId = useAnalyzerStore((s) => s.presetId);
  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const handleSelect = (preset: (typeof presets)[0]): void => {
    if (selectedPresetId === preset.id) {
      // Toggle off
      setPreset(null);
    } else {
      setPreset(preset);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    preset: (typeof presets)[0],
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(preset);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {presets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          const title = isId ? preset.titleId : preset.titleEn;
          const subtitle = isId ? preset.subtitleId : preset.subtitleEn;

          return (
            <Card
              key={preset.id}
              tone={isSelected ? 'white' : 'parchment'}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(preset)}
              onKeyDown={(e) => handleKeyDown(e, preset)}
              className={cn(
                'group p-5 cursor-pointer flex flex-col justify-between transition-all select-none',
                isSelected ? 'border-2 border-ink' : 'border border-ash hover:border-graphite',
              )}
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner bg-ash/30 mb-3">
                  <img
                    src={preset.imageUrl}
                    alt={title}
                    width={320}
                    height={200}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-ink text-lime text-xs font-medium px-2 py-0.5 rounded-pill">
                      Selected
                    </div>
                  )}
                </div>

                <h4 className="text-body font-medium text-ink leading-tight">{title}</h4>
                <p className="mt-1 text-xs text-graphite line-clamp-2 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-ash/40 flex items-center justify-between text-xs text-graphite font-medium">
                <span>Default: {preset.defaultHour}:00 WITA</span>
                <Pill tone={isSelected ? 'dark' : 'default'} className="text-[10px]">
                  Preset
                </Pill>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
