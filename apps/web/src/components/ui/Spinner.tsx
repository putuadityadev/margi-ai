import type { SVGAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  ref?: Ref<SVGSVGElement>;
}

export function Spinner({
  size = 'md',
  label = 'Loading...',
  className,
  ref,
  ...props
}: SpinnerProps): ReactNode {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  return (
    <svg
      ref={ref}
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin text-ink', sizeClasses, className)}
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
