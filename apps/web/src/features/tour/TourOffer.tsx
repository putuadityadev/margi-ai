import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { runTour } from './runTour';
import { declineTours, wasOffered } from './tourMemory';

/**
 * One-time offer shown right after the intro slides: take the short tour (this screen now, the
 * next screens as they open) or skip every tour (they stay available from the Guide button).
 */
export function TourOffer(): ReactNode {
  const { t } = useTranslation('tour');
  const [open, setOpen] = useState(() => !wasOffered());
  if (!open) return null;

  const start = (): void => {
    setOpen(false);
    runTour('start');
  };
  const skip = (): void => {
    declineTours();
    setOpen(false);
  };

  return (
    <section
      role="dialog"
      aria-labelledby="tour-offer-title"
      className="absolute inset-x-3 top-20 z-30 border border-ink bg-white p-4 md:right-4 md:left-auto md:w-[340px]"
    >
      <h2 id="tour-offer-title" className="text-body font-medium text-ink">
        {t('offer.title')}
      </h2>
      <p className="mt-1 text-body-sm text-graphite">{t('offer.body')}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={start}
          className="h-11 flex-1 border border-ink bg-lime px-3 text-body-sm font-medium text-ink"
        >
          {t('offer.start')}
        </button>
        <button
          type="button"
          onClick={skip}
          className="h-11 border border-ink bg-white px-4 text-body-sm text-ink"
        >
          {t('offer.skip')}
        </button>
      </div>
    </section>
  );
}
