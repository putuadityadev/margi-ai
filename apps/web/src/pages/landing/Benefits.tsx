import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { JamRoute, QueueClock, Recalc, SourceTick, TwinBars, Warung } from './Illustrations';

const CELLS = [
  { key: 'wait', Art: QueueClock, span: 'lg:col-span-5', tone: 'bg-white' },
  { key: 'twin', Art: TwinBars, span: 'lg:col-span-4', tone: 'bg-white' },
  { key: 'traffic', Art: JamRoute, span: 'lg:col-span-3', tone: 'bg-mist' },
  { key: 'local', Art: Warung, span: 'lg:col-span-3', tone: 'bg-mist' },
  { key: 'trust', Art: SourceTick, span: 'lg:col-span-4', tone: 'bg-white' },
  { key: 'change', Art: Recalc, span: 'lg:col-span-5', tone: 'bg-white' },
] as const;

/** What the traveller gets, as a bento of six ruled cells, each with its own line illustration. */
export function Benefits(): ReactNode {
  const { t } = useTranslation('landing');

  return (
    <section className="bg-white px-5 py-[14svh] sm:px-8">
      <div className="mx-auto max-w-[1300px]">
        <h2 className="max-w-[40rem] text-[clamp(34px,4.8vw,72px)] font-medium leading-[1] tracking-[-0.04em]">
          {t('benefits.title')}
        </h2>
        <ul className="mt-[8svh] grid gap-px border border-ink bg-ink lg:grid-cols-12">
          {CELLS.map(({ key, Art, span, tone }) => (
            <li
              key={key}
              className={cn(
                'flex min-h-[20rem] flex-col justify-between gap-10 p-6 sm:p-8',
                span,
                tone,
              )}
            >
              <Art />
              <div>
                <h3 className="text-subheading font-medium leading-[1.12] tracking-[-0.02em]">
                  {t(`benefits.items.${key}.title`)}
                </h3>
                <p className="mt-2 max-w-[26rem] text-body-sm leading-[1.55] text-charcoal">
                  {t(`benefits.items.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
