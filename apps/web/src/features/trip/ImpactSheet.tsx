import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import type { TripMetrics } from '@margi-ai/shared';
import { MargiAvatar } from '../../components/brand/MargiAvatar';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';

export interface ImpactSheetProps {
  /** Metrics of the traveller's own plan before MARGI's changes, or null if none were applied. */
  readonly before: TripMetrics | null;
  readonly after: TripMetrics;
  readonly navigateUrl: string | null;
  readonly onClose: () => void;
}

interface ImpactRow {
  readonly key: string;
  readonly label: string;
  readonly before: number | null;
  readonly after: number;
  readonly unit: string;
  /** True when a lower value is the better outcome. */
  readonly lowerIsBetter: boolean;
}

/**
 * Closing moment after saving: what the plan changes for crowds, jams, and the local economy.
 * Every figure comes from the evaluated plans; nothing is estimated here.
 */
export function ImpactSheet({ before, after, navigateUrl, onClose }: ImpactSheetProps): ReactNode {
  const { t } = useTranslation('trip');
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-impact-panel]', {
          y: 40,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power3.out',
        });
        gsap.from('[data-impact-row]', {
          x: -12,
          autoAlpha: 0,
          duration: 0.4,
          stagger: 0.08,
          delay: 0.25,
          ease: 'power3.out',
        });
      });
    },
    { scope },
  );

  const rows: ImpactRow[] = [
    {
      key: 'crowd',
      label: t('impact.crowd'),
      before: before?.crowdExposure ?? null,
      after: after.crowdExposure,
      unit: '',
      lowerIsBetter: true,
    },
    {
      key: 'delay',
      label: t('impact.delay'),
      before: before?.totalDelayMinutes ?? null,
      after: after.totalDelayMinutes,
      unit: 'm',
      lowerIsBetter: true,
    },
    {
      key: 'red',
      label: t('impact.redZones'),
      before: before?.redZoneStops ?? null,
      after: after.redZoneStops,
      unit: '',
      lowerIsBetter: true,
    },
    {
      key: 'local',
      label: t('impact.local'),
      before: before?.msmeStops ?? null,
      after: after.msmeStops,
      unit: '',
      lowerIsBetter: false,
    },
    {
      key: 'recipient',
      label: t('impact.recipient'),
      before: before?.recipientRegencyStops ?? null,
      after: after.recipientRegencyStops,
      unit: '',
      lowerIsBetter: false,
    },
  ];

  return (
    <div
      ref={scope}
      className="absolute inset-0 z-50 flex items-end bg-ink/40 md:items-center md:justify-center"
    >
      <section
        data-impact-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby="impact-title"
        className="w-full border-t border-ink bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:w-[440px] md:border"
      >
        <div className="flex items-center gap-4">
          <MargiAvatar mood="happy" size={64} tracking={false} />
          <div>
            <h2 id="impact-title" className="text-heading font-medium text-ink">
              {t('impact.title')}
            </h2>
            <p className="text-body-sm text-graphite">
              {before ? t('impact.subtitle') : t('impact.noChange')}
            </p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-ash border-y border-ink">
          {before && (
            <div className="grid grid-cols-[1fr_56px_56px] gap-2 py-1.5 font-mono text-[10px] text-graphite uppercase">
              <span />
              <span className="text-right">{t('impact.before')}</span>
              <span className="text-right">{t('impact.after')}</span>
            </div>
          )}
          {rows.map((row) => {
            const improved =
              row.before !== null &&
              (row.lowerIsBetter ? row.after < row.before : row.after > row.before);
            return (
              <div
                key={row.key}
                data-impact-row
                className="grid grid-cols-[1fr_56px_56px] items-center gap-2 py-2.5"
              >
                <dt className="text-body-sm text-ink">{row.label}</dt>
                <dd className="text-right font-mono text-body-sm text-graphite">
                  {row.before !== null ? `${row.before}${row.unit}` : ''}
                </dd>
                <dd
                  className={cn('text-right font-mono text-body text-ink', improved && 'bg-lime')}
                >
                  <AnimatedNumber value={row.after} />
                  {row.unit}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-5 flex gap-2">
          {navigateUrl && (
            <a
              href={navigateUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 flex-1 items-center justify-between border border-ink bg-lime px-4 text-body font-medium text-ink"
            >
              {t('impact.navigate')}
              <Navigation size={18} aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="h-12 flex-1 border border-ink bg-white text-body text-ink hover:bg-parchment"
          >
            {t('impact.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
