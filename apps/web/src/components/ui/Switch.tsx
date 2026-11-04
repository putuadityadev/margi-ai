import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  className,
  disabled,
  ref,
  ...props
}: SwitchProps): ReactNode {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-none border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
          checked ? 'bg-ink border-ink' : 'bg-ash border-stone/50',
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-none transform transition-transform duration-200',
            checked ? 'translate-x-6 bg-lime' : 'translate-x-1 bg-white',
          )}
        />
      </button>

      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-graphite">{description}</span>}
        </span>
      )}
    </label>
  );
}
