import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  error,
  helperText,
  className,
  id,
  disabled,
  ref,
  ...props
}: InputProps): ReactNode {
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
      <input
        ref={ref}
        id={id}
        disabled={disabled}
        className={cn(
          'w-full rounded-input border bg-white px-3.5 py-2 text-sm text-ink placeholder:text-stone transition-colors',
          'focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1',
          'disabled:opacity-50 disabled:bg-parchment disabled:cursor-not-allowed',
          error ? 'border-charcoal' : 'border-ash hover:border-stone',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-ink font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-graphite">{helperText}</span>}
    </div>
  );
}
