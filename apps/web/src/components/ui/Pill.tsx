import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'parchment' | 'dark' | 'sim' | 'outline';
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

export function Pill({
  tone = 'default',
  className,
  children,
  ref,
  ...props
}: PillProps): ReactNode {
  const toneClasses = {
    default: 'bg-ash/50 text-ink border border-ash',
    parchment: 'bg-parchment text-ink border border-ash',
    dark: 'bg-charcoal text-parchment border border-stone',
    sim: 'bg-sim-banner text-ink border border-ash',
    outline: 'bg-transparent text-ink border border-ash',
  }[tone];

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-1 text-eyebrow font-medium uppercase tracking-[0.1em]',
        toneClasses,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Alias Tag to Pill
export const Tag = Pill;
