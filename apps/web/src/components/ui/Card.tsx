import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'white' | 'parchment' | 'dark' | 'lime';
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Card({ tone = 'white', className, children, ref, ...props }: CardProps): ReactNode {
  const toneClasses = {
    white: 'bg-white text-ink border border-ash',
    parchment: 'bg-parchment text-ink border border-ash',
    dark: 'bg-charcoal text-parchment border border-stone',
    lime: 'bg-lime text-ink border-none',
  }[tone];

  return (
    <div
      ref={ref}
      className={cn('rounded-card p-8 md:p-12 transition-colors', toneClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}
