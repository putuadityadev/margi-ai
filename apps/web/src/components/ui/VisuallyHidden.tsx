import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

export function VisuallyHidden({
  children,
  className,
  ref,
  ...props
}: VisuallyHiddenProps): ReactNode {
  return (
    <span ref={ref} className={cn('sr-only', className)} {...props}>
      {children}
    </span>
  );
}
