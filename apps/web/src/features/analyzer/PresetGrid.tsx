import { type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CheckCircleIcon } from '../../components/ui';
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {presets.map((preset) => {
        const isSelected = selectedPresetId === preset.id;
        const title = isId ? preset.titleId : preset.titleEn;

        return (
          <Card
            key={preset.id}
            tone={isSelected ? 'white' : 'parchment'}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={title}
            onClick={() => handleSelect(preset)}
            onKeyDown={(e) => handleKeyDown(e, preset)}
            className={cn(
              'group p-2.5 cursor-pointer flex flex-col justify-between transition-all select-none',
              isSelected ? 'border-2 border-ink' : 'border border-ash hover:border-graphite',
            )}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-inner bg-ash/30 mb-2">
              <img
                src={preset.imageUrl}
                alt={title}
                width={240}
                height={180}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 bg-lime text-ink border border-ink p-1 rounded-pill">
                  <CheckCircleIcon size={14} />
                </div>
              )}
            </div>

            <div className="px-0.5">
              <div className="text-xs font-medium text-ink leading-snug line-clamp-2">{title}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
