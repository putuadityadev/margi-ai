import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon, StoreIcon } from '../../components/ui';

export interface ImpactBadgesProps {
  readonly timeSavedMin: readonly [number, number];
  readonly fiscalBoost: boolean;
  readonly supportsMsmeCount: number;
  readonly className?: string;
}

export function ImpactBadges({
  timeSavedMin,
  supportsMsmeCount,
  className = '',
}: ImpactBadgesProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;

  const hasTimeSaved = timeSavedMin[0] > 0 || timeSavedMin[1] > 0;

  if (!hasTimeSaved && supportsMsmeCount <= 0) {
    return null;
  }

  const timeSavedLabel =
    timeSavedMin[0] === timeSavedMin[1]
      ? `~${timeSavedMin[0]}`
      : `~${timeSavedMin[0]}–${timeSavedMin[1]}`;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`} data-testid="impact-badges">
      {hasTimeSaved ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-parchment text-ink border border-ash/80 text-xs font-normal"
          data-testid="badge-time-saved"
        >
          <ClockIcon size={13} className="text-graphite shrink-0" />
          <span>
            {t('timeSaved', isId ? 'Hemat antre' : 'Save')} {timeSavedLabel}{' '}
            {isId ? 'mnt' : 'min'}
          </span>
        </span>
      ) : null}

      {supportsMsmeCount > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-parchment text-ink border border-ash/80 text-xs font-normal"
          data-testid="badge-msme-support"
        >
          <StoreIcon size={13} className="text-graphite shrink-0" />
          <span>
            {isId
              ? `${supportsMsmeCount} UMKM lokal di sekitar`
              : `${supportsMsmeCount} local spots nearby`}
          </span>
        </span>
      ) : null}
    </div>
  );
}
