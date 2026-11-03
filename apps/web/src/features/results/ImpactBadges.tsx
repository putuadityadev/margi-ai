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

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`} data-testid="impact-badges">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-parchment text-ink border border-ash text-xs"
        data-testid="badge-time-saved"
      >
        <ClockIcon size={13} className="text-graphite" />
        <span>
          {t('timeSaved', isId ? 'Hemat antre' : 'Save')} ~{timeSavedMin[0]}–{timeSavedMin[1]}{' '}
          {isId ? 'mnt' : 'min'}
        </span>
      </span>

      {supportsMsmeCount > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-parchment text-ink border border-ash text-xs"
          data-testid="badge-msme-support"
        >
          <StoreIcon size={13} className="text-graphite" />
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
