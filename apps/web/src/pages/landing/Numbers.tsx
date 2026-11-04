import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import { UnevenBars } from './Diagrams';
import { gsap, motionAllowed } from './motion';

const BIG = 'visitors';
const SMALL = [
  { key: 'gridlock', to: 11, decimals: 0, span: 'lg:col-span-4' },
  { key: 'bangli', to: 43, decimals: 0, span: 'lg:col-span-3' },
] as const;

/** Splits "7.05M" into its number and unit so only the number counts up. */
function splitValue(value: string): { number: string; unit: string } {
  const match = /^([\d.,]+)\s*(.*)$/.exec(value);
  return { number: match?.[1] ?? value, unit: match?.[2] ?? '' };
}

function Stat({
  id,
  to,
  decimals,
  className,
  big = false,
}: {
  readonly id: string;
  readonly to: number;
  readonly decimals: number;
  readonly className: string;
  readonly big?: boolean;
}): ReactNode {
  const { t } = useTranslation('landing');
  const { number, unit } = splitValue(t(`numbers.items.${id}.value`));
  return (
    <div className={`flex flex-col justify-between gap-10 bg-white p-6 sm:p-8 ${className}`}>
      <p
        className={
          big
            ? 'text-[clamp(72px,11vw,176px)] font-medium leading-[0.86] tracking-[-0.055em]'
            : 'text-[clamp(56px,6.6vw,104px)] font-medium leading-[0.9] tracking-[-0.05em]'
        }
      >
        <span data-count data-to={to} data-decimals={decimals} data-final={number}>
          {number}
        </span>
        {unit && (
          <span className="ml-2 text-[0.36em] tracking-[-0.02em] text-graphite">{unit}</span>
        )}
      </p>
      <p className="max-w-[22rem] text-body-sm leading-[1.5] text-charcoal">
        {t(`numbers.items.${id}.label`)}
      </p>
    </div>
  );
}

/** Sourced facts as a bento grid of ink-ruled cells; the numbers count up once, the bars rise. */
export function Numbers(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      const elements = root.current?.querySelectorAll<HTMLElement>('[data-count]') ?? [];
      elements.forEach((element) => {
        // The final text lives in a data attribute so a re-run (StrictMode, revert) never reads a half-counted value.
        const finalText = element.dataset.final ?? '';
        const target = Number(element.dataset.to);
        const decimals = Number(element.dataset.decimals);
        const comma = finalText.includes(',');
        const counter = { value: 0 };
        element.textContent = (0).toFixed(decimals);
        gsap.to(counter, {
          value: target,
          duration: 1.8,
          ease: 'expo.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          onUpdate: () => {
            const text = counter.value.toFixed(decimals);
            element.textContent = comma ? text.replace('.', ',') : text;
          },
          onComplete: () => {
            element.textContent = finalText;
          },
        });
      });
      gsap.from('[data-bar]', {
        scaleY: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '[data-bar]', start: 'top 90%', once: true },
      });
      return () =>
        elements.forEach((element) => (element.textContent = element.dataset.final ?? ''));
    },
    { scope: root, dependencies: [t('numbers.title')] },
  );

  return (
    <section
      ref={root}
      className="bg-white bg-[linear-gradient(to_right,rgba(20,20,15,0.07)_1px,transparent_1px)] bg-[size:25%_100%] px-5 py-[14svh] sm:px-8"
    >
      <div className="mx-auto grid max-w-[1300px] gap-px border border-ink bg-ink lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-14 bg-white p-6 sm:p-8 lg:col-span-5 lg:row-span-2">
          <h2 className="max-w-[24rem] text-[clamp(32px,3.8vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]">
            {t('numbers.title')}
          </h2>
          <div className="space-y-4">
            <UnevenBars label={t('numbers.chart')} />
            <p className="text-caption text-graphite">{t('numbers.source')}</p>
          </div>
        </div>
        <Stat id={BIG} to={7.05} decimals={2} big className="lg:col-span-7" />
        {SMALL.map((row) => (
          <Stat
            key={row.key}
            id={row.key}
            to={row.to}
            decimals={row.decimals}
            className={row.span}
          />
        ))}
      </div>
    </section>
  );
}
