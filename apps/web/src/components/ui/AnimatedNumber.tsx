import { useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';

export interface AnimatedNumberProps {
  readonly value: number;
  readonly className?: string;
  /** Flash the background lime when the value drops (lower is better, e.g. crowd). */
  readonly flashOnDecrease?: boolean;
}

const COUNT_DURATION_S = 0.8;

/**
 * Integer that counts from its previous value to the new one with tabular numerals.
 * The final value is always in the DOM, so reduced motion and screen readers get it directly.
 */
export function AnimatedNumber({
  value,
  className,
  flashOnDecrease = false,
}: AnimatedNumberProps): ReactNode {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useGSAP(
    () => {
      const from = previous.current;
      previous.current = value;
      const element = node.current;
      if (!element || from === value) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const counter = { current: from };
        gsap.to(counter, {
          current: value,
          duration: COUNT_DURATION_S,
          ease: 'power3.out',
          onUpdate: () => {
            element.textContent = String(Math.round(counter.current));
          },
          onComplete: () => {
            element.textContent = String(value);
          },
        });
        if (flashOnDecrease && value < from) {
          gsap.fromTo(
            element,
            { backgroundColor: 'var(--color-lime)' },
            {
              backgroundColor: 'rgba(190, 255, 80, 0)',
              duration: 1.4,
              ease: 'power2.out',
              clearProps: 'backgroundColor',
            },
          );
        }
      });
    },
    { dependencies: [value] },
  );

  return (
    <span ref={node} className={cn('tabular-nums', className)}>
      {value}
    </span>
  );
}
