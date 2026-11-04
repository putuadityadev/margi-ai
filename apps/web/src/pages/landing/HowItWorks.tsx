import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import { cn } from '../../lib/cn';
import { CalmMap, MoodChips, PinRadius, PlanGo } from './FlowArt';
import { gsap, motionAllowed } from './motion';

const STEPS = [
  { key: 'where', Art: PinRadius },
  { key: 'mood', Art: MoodChips },
  { key: 'calm', Art: CalmMap },
  { key: 'go', Art: PlanGo },
] as const;

/**
 * The traveller's flow in four steps. Here the order is the point, so the steps are numbered.
 * One line draws across the grid and each step switches on as it passes.
 */
export function HowItWorks(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      gsap
        .timeline({
          scrollTrigger: { trigger: '[data-flow]', start: 'top 72%', once: true },
          defaults: { ease: 'power2.out' },
        })
        .fromTo(
          '[data-line-x]',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.6, ease: 'power2.inOut' },
          0,
        )
        .from('[data-node]', { scale: 0, duration: 0.5, stagger: 0.4, ease: 'back.out(2.4)' }, 0.1)
        .from('[data-stage]', { opacity: 0.25, duration: 0.7, stagger: 0.4 }, 0);
    },
    { scope: root },
  );

  return (
    <section
      id="how"
      ref={root}
      className="bg-white bg-[linear-gradient(to_right,rgba(20,20,15,0.07)_1px,transparent_1px)] bg-[size:25%_100%] px-5 py-[14svh] sm:px-8"
    >
      <div className="mx-auto max-w-[1300px]">
        <h2 className="max-w-[44rem] text-[clamp(34px,4.8vw,72px)] font-medium leading-[1] tracking-[-0.04em]">
          {t('flow.title')}
        </h2>
        <p className="mt-5 max-w-[30rem] text-body leading-[1.55] text-charcoal">
          {t('flow.intro')}
        </p>

        <div data-flow className="relative mt-[8svh]">
          <div
            data-line-x
            aria-hidden="true"
            className="absolute left-0 right-0 top-[-1px] hidden h-[3px] origin-left bg-ink lg:block"
          />
          <ol className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ key, Art }, index) => (
              <li
                key={key}
                data-stage
                className={cn(
                  'relative flex min-h-[17rem] flex-col gap-10 p-6 sm:p-7',
                  key === 'calm' ? 'bg-lime' : 'bg-white',
                )}
              >
                <span
                  data-node
                  aria-hidden="true"
                  className="absolute -top-[7px] left-6 hidden h-[13px] w-[13px] border-2 border-ink bg-lime lg:block"
                />
                <div className="flex items-start justify-between gap-4">
                  <Art />
                  <span
                    aria-hidden="true"
                    className="text-[clamp(44px,4.4vw,64px)] font-medium leading-[0.8] tracking-[-0.05em]"
                  >
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-[24px] font-medium leading-[1.1] tracking-[-0.025em]">
                    {t(`flow.steps.${key}.title`)}
                  </h3>
                  <p className="mt-3 max-w-[18rem] text-body-sm leading-[1.55]">
                    {t(`flow.steps.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
