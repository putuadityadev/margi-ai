import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleHelp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { runTour } from './runTour';
import type { TourId } from './tours';

export interface TourButtonProps {
  readonly tour: TourId;
  readonly className?: string;
}

/** "Guide" button in a screen's header: replays that screen's tour. */
export function TourButton({ tour, className }: TourButtonProps): ReactNode {
  const { t } = useTranslation('tour');
  return (
    <button
      type="button"
      data-tour="help"
      onClick={() => runTour(tour)}
      aria-label={t('help')}
      title={t('help')}
      className={cn(
        'pointer-events-auto flex h-11 w-11 flex-none items-center justify-center border border-ink bg-white text-ink',
        className,
      )}
    >
      <CircleHelp size={17} aria-hidden="true" />
    </button>
  );
}
