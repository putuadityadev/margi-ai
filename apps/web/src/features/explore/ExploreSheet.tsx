import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';

export interface ExploreSheetProps {
  readonly children: ReactNode;
  /** Changing the key replays the entrance animation (one per step). */
  readonly motionKey: string;
  readonly label: string;
  /** Reports the sheet height so the map can keep pins out from under it. */
  readonly onHeightChange?: (heightPx: number) => void;
  readonly className?: string;
}

/**
 * Panel that hosts each step: a bottom sheet on phones, a floating left column on
 * wider screens. Sharp edges and a hairline ink border, per DESIGN.md.
 */
export function ExploreSheet({
  children,
  motionKey,
  label,
  onHeightChange,
  className,
}: ExploreSheetProps): ReactNode {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(scope.current, { y: 32, autoAlpha: 0, duration: 0.5, ease: 'power3.out' });
        gsap.from('[data-sheet-item]', {
          y: 14,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.05,
          delay: 0.08,
        });
      });
    },
    { scope, dependencies: [motionKey], revertOnUpdate: true },
  );

  useEffect(() => {
    const node = scope.current;
    if (!node || !onHeightChange) return;
    const report = (): void => onHeightChange(node.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeightChange, motionKey]);

  return (
    <section
      ref={scope}
      aria-label={label}
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 border-t border-ink bg-white',
        'px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        'md:inset-x-auto md:top-20 md:bottom-auto md:left-4 md:w-[400px] md:border',
        className,
      )}
    >
      {children}
    </section>
  );
}
