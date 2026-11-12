import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { toWita, type TripPlan, type TripStop } from '@margi-ai/shared';
import { crowdLevelKey, placeName } from '../explore/placeText';
import { planToIcs } from './planToIcs';

export interface CalendarButtonProps {
  readonly plan: TripPlan | undefined;
}

/** Downloads the plan as an .ics file (one event per stop) for Google Calendar or a phone. */
export function CalendarButton({ plan }: CalendarButtonProps): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const { t: tExplore } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');

  const describe = (stop: TripStop): string => {
    const crowd =
      stop.place.venue.kind === 'OTHER'
        ? t('calendar.noForecast')
        : stop.place.isOpenNow
          ? t('calendar.crowd', {
              level: tExplore(`crowd.levels.${crowdLevelKey(stop.place.crowd)}`),
              value: stop.place.crowd.busynessPct,
            })
          : t('calendar.closed');
    const travel = t('calendar.travel', {
      minutes: stop.leg.travelMinutes + stop.leg.corridorDelayMinutes,
      km: stop.leg.distanceKm.toFixed(1),
    });
    return [crowd, travel, t('calendar.footer')].join('\n');
  };

  const download = (): void => {
    if (!plan) return;
    const ics = planToIcs(plan, {
      name: (stop) => placeName(stop.place.venue, isId),
      describe,
      now: new Date(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `margi-${toWita(plan.request.departAt).toFormat('yyyy-MM-dd')}.ics`;
    link.click();
    // Revoke after the click has been handled, or some browsers cancel the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={!plan}
      data-tour="calendar"
      aria-label={t('calendar.button')}
      title={t('calendar.button')}
      className="flex h-14 w-14 flex-none items-center justify-center border border-ink bg-white text-ink disabled:opacity-40"
    >
      <CalendarPlus size={18} aria-hidden="true" />
    </button>
  );
}
