import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { MargiAvatar } from '../../components/brand/MargiAvatar';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';

/** Pipeline stages MARGI runs for every answer, in order (mirrors the reply trace). */
const STEPS = ['understand', 'crowd', 'corridor', 'rank', 'compose'] as const;
/** Pace of the stage list while waiting; the reply replaces this view as soon as it lands. */
const STEP_INTERVAL_MS = 520;

/**
 * Waiting state for a copilot answer: the avatar thinks while the pipeline stages tick
 * through. Purely presentational; it never delays the reply.
 */
export function CopilotThinking(): ReactNode {
  const { t } = useTranslation('trip');
  const [active, setActive] = useState(0);
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(`[data-step="${active}"]`, {
          x: -8,
          autoAlpha: 0,
          duration: 0.35,
          ease: 'power3.out',
        });
      });
    },
    { scope, dependencies: [active] },
  );

  return (
    <div
      ref={scope}
      role="status"
      aria-label={t('copilot.thinking')}
      className="flex gap-4 border border-ink bg-parchment p-4"
    >
      <MargiAvatar mood="thinking" size={56} tracking={false} />
      <ol className="min-w-0 flex-1 space-y-1.5">
        {STEPS.slice(0, active + 1).map((step, index) => {
          const isDone = index < active;
          return (
            <li key={step} data-step={index} className="flex items-center gap-2 text-body-sm">
              <span
                className={cn(
                  'flex h-4 w-4 flex-none items-center justify-center border border-ink',
                  isDone ? 'bg-ink text-lime' : 'typing-dot bg-lime',
                )}
                aria-hidden="true"
              >
                {isDone && <Check size={10} strokeWidth={3} />}
              </span>
              <span className={isDone ? 'text-graphite' : 'text-ink'}>
                {t(`copilot.steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
