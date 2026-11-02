import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface InnerCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'white' | 'parchment' | 'dark';
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function InnerCard({
  tone = 'parchment',
  className,
  children,
  ref,
  ...props
}: InnerCardProps): ReactNode {
  const toneClasses = {
    white: 'bg-white text-ink border border-ash',
    parchment: 'bg-parchment text-ink border border-ash/60',
    dark: 'bg-charcoal text-parchment border border-stone/60',
  }[tone];

  return (
    <div
      ref={ref}
      className={cn('rounded-inner p-4 md:p-6 transition-colors', toneClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}
