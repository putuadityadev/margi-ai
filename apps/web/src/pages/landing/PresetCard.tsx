import { type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card, Pill } from '../../components/ui';
import { track } from '../../lib/track';
import { cn } from '../../lib/cn';

export interface PresetCardItem {
  id: string;
  titleEn: string;
  titleId: string;
  subtitleEn: string;
  subtitleId: string;
  imageUrl: string;
  regencyEn: string;
  regencyId: string;
  queueEn: string;
  queueId: string;
}

export interface PresetCardProps {
  preset: PresetCardItem;
  index: number;
  className?: string;
}

export function PresetCard({ preset, index, className }: PresetCardProps): ReactNode {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('landing');
  const isId = i18n.language.startsWith('id');

  const title = isId ? preset.titleId : preset.titleEn;
  const regency = isId ? preset.regencyId : preset.regencyEn;
  const queue = isId ? preset.queueId : preset.queueEn;

  const handleLaunch = (): void => {
    track('preset_clicked', { presetId: preset.id });
    void navigate(`/app?preset=${preset.id}&run=1`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLaunch();
    }
  };

  return (
    <Card
      tone="parchment"
      role="button"
      tabIndex={0}
      aria-label={`${title} - ${queue}. ${t('hero.runPresetCta')}`}
      onClick={handleLaunch}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex flex-col justify-between cursor-pointer p-3 sm:p-4 border border-ash hover:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 select-none',
        className,
      )}
    >
      <div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner bg-ash/30 mb-3">
          <img
            src={preset.imageUrl}
            alt={title}
            width={400}
            height={250}
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            <Pill tone="dark">{regency}</Pill>
          </div>
        </div>

        <h3 className="text-body-sm sm:text-body font-medium text-ink leading-snug line-clamp-2">
          {title}
        </h3>
      </div>

      <div className="pt-2.5 mt-2.5 border-t border-ash/60 flex items-center justify-between gap-2 text-xs">
        <span className="text-graphite truncate">{queue}</span>
        <span className="inline-flex items-center gap-1 font-medium text-ink shrink-0 group-hover:underline">
          <span>{t('hero.runPresetCta')}</span>
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Card>
  );
}
