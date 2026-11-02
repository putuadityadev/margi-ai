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
  const subtitle = isId ? preset.subtitleId : preset.subtitleEn;
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
        'group flex flex-col justify-between cursor-pointer p-6 md:p-7 border border-ash hover:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-4 select-none',
        className,
      )}
    >
      <div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner bg-ash/30 mb-5">
          <img
            src={preset.imageUrl}
            alt={title}
            width={480}
            height={300}
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Pill tone="dark">{regency}</Pill>
            <Pill tone="sim">{queue}</Pill>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-subheading font-medium text-ink leading-tight tracking-tight">
            {title}
          </h3>
          <p className="text-body-sm text-graphite line-clamp-2 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <div className="pt-6 mt-4 border-t border-ash/50 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.1em] text-graphite font-medium">
          {t('presets.avgWait')}: {queue}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:underline">
          {t('hero.runPresetCta')}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Card>
  );
}
