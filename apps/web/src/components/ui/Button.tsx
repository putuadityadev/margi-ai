import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ref,
  type = 'button',
  ...props
}: ButtonProps): ReactNode {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variantClasses = {
    // Primary: electric lime pill CTA (the singular lime action path)
    primary: 'bg-lime text-ink rounded-pill hover:brightness-95 active:brightness-90',
    // Ghost: transparent background, off-black text, subtle parchment hover
    ghost: 'bg-transparent text-ink rounded-pill hover:bg-parchment active:bg-ash/50',
    // Link: underline affordance, no fill
    link: 'bg-transparent text-ink underline underline-offset-4 hover:text-graphite rounded-none p-0 h-auto',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  }[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(baseClasses, variant !== 'link' && sizeClasses, variantClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
}
