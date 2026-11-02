import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  label,
  error,
  helperText,
  className,
  id,
  children,
  disabled,
  ref,
  ...props
}: SelectProps): ReactNode {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-graphite uppercase tracking-[0.1em]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            'w-full appearance-none rounded-input border bg-white px-3.5 py-2 pr-10 text-sm text-ink transition-colors cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1',
            'disabled:opacity-50 disabled:bg-parchment disabled:cursor-not-allowed',
            error ? 'border-charcoal' : 'border-ash hover:border-stone',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-graphite">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs text-ink font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-graphite">{helperText}</span>}
    </div>
  );
}
