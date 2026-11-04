import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Radar } from 'lucide-react';
import type { VibeTag } from '@margi-ai/shared';
import { cn } from '../../lib/cn';
import { ExploreSheet } from './ExploreSheet';
import { VIBE_ICONS, VIBE_ORDER } from './vibeIcons';

export interface VibeSheetProps {
  readonly selected: readonly VibeTag[];
  readonly onToggle: (tag: VibeTag) => void;
  readonly onScan: () => void;
  readonly onSkip: () => void;
  readonly onHeightChange: (heightPx: number) => void;
}

/** Step 2: optional mood filter before the radar scan. */
export function VibeSheet({
  selected,
  onToggle,
  onScan,
  onSkip,
  onHeightChange,
}: VibeSheetProps): ReactNode {
  const { t } = useTranslation('explore');

  return (
    <ExploreSheet motionKey="vibe" label={t('vibe.title')} onHeightChange={onHeightChange}>
      <div data-sheet-item className="flex items-baseline justify-between gap-3">
        <h1 className="text-heading font-medium text-ink">{t('vibe.title')}</h1>
        <span className="text-body-sm text-graphite">{t('vibe.hint')}</span>
      </div>

      <div data-sheet-item className="mt-4 grid grid-cols-4 gap-1.5">
        {VIBE_ORDER.map((tag) => {
          const Icon = VIBE_ICONS[tag];
          const isOn = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(tag)}
              className={cn(
                'flex h-[76px] flex-col items-start justify-between border p-2.5 text-left transition-colors duration-200',
                isOn
                  ? 'border-ink bg-ink text-white'
                  : 'border-ash bg-white text-ink hover:border-ink',
              )}
            >
              <Icon size={18} strokeWidth={1.6} className={isOn ? 'text-lime' : 'text-ink'} />
              <span className="text-[12px] leading-tight font-medium">{t(`vibe.tags.${tag}`)}</span>
            </button>
          );
        })}
      </div>

      <button
        data-sheet-item
        type="button"
        onClick={onScan}
        className="mt-4 flex h-14 w-full items-center justify-between border border-ink bg-lime px-5 text-body font-medium text-ink active:scale-[0.99]"
      >
        <span>{t('vibe.scan')}</span>
        <span className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="font-mono text-caption tracking-normal">{selected.length}</span>
          )}
          <Radar size={20} />
        </span>
      </button>

      <div data-sheet-item className="mt-3 flex items-center justify-between text-body-sm">
        <button
          type="button"
          onClick={onSkip}
          className="py-2 text-graphite underline underline-offset-4 hover:text-ink"
        >
          {t('vibe.skip')}
        </button>
      </div>
    </ExploreSheet>
  );
}
