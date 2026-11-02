import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Pill } from '../../components/ui';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { WITA_ZONE, toWita } from '@margi-ai/shared';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export function ArrivalTimePicker(): ReactNode {
  const { t } = useTranslation('analyzer');
  const arrival = useAnalyzerStore((s) => s.arrival);
  const setArrival = useAnalyzerStore((s) => s.setArrival);

  const DAYS = useMemo(
    () => [
      { value: 0, label: t('days.mon') },
      { value: 1, label: t('days.tue') },
      { value: 2, label: t('days.wed') },
      { value: 3, label: t('days.thu') },
      { value: 4, label: t('days.fri') },
      { value: 5, label: t('days.sat') },
      { value: 6, label: t('days.sun') },
    ],
    [t],
  );

  // Check if browser timezone is different from WITA (Asia/Makassar, UTC+8)
  const localEquivalent = useMemo(() => {
    if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') {
      return null;
    }
    const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      !userZone ||
      userZone === WITA_ZONE ||
      userZone === 'Asia/Singapore' ||
      userZone === 'Asia/Kuala_Lumpur'
    ) {
      return null;
    }

    try {
      // Calculate offset difference
      const now = new Date();
      const witaDate = toWita(now);
      const diffHours = (now.getTime() - witaDate.toMillis()) / (1000 * 60 * 60);

      // Local hour equivalent
      let localHour = Math.round(arrival.hour + diffHours);
      if (localHour < 0) localHour += 24;
      if (localHour >= 24) localHour -= 24;

      const formattedHour = `${String(localHour).padStart(2, '0')}:00`;
      return t('localTimeEquivalent', { time: `${formattedHour} (${userZone})` });
    } catch {
      return null;
    }
  }, [arrival.hour, t]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="arrival-day-select" className="text-body-sm font-medium text-ink">
          {t('timeLabel')}
        </label>
        <Pill tone="default" className="text-[10px]">
          {t('witaBadge')}
        </Pill>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="arrival-day-select"
          aria-label={t('dayLabel')}
          value={arrival.day}
          onChange={(e) => setArrival({ day: Number(e.target.value) })}
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>

        <Select
          id="arrival-hour-select"
          aria-label={t('hourLabel')}
          value={arrival.hour}
          onChange={(e) => setArrival({ hour: Number(e.target.value) })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00 WITA
            </option>
          ))}
        </Select>
      </div>

      {localEquivalent && <p className="text-caption text-graphite pt-1">{localEquivalent}</p>}
    </div>
  );
}
