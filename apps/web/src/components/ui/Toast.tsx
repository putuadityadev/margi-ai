import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ToastItem {
  id: string;
  title?: ReactNode;
  message: ReactNode;
  tone?: 'default' | 'sim' | 'dark';
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

export function ToastRegion({ toasts, onDismiss, className }: ToastProps): ReactNode {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none',
        className,
      )}
    >
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
        {toasts.map((toast) => {
          const toneClasses = {
            default: 'bg-white text-ink border-ash',
            sim: 'bg-sim-banner text-ink border-stone',
            dark: 'bg-charcoal text-parchment border-stone',
          }[toast.tone ?? 'default'];

          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start justify-between gap-3 rounded-inner border p-4 transition-all',
                toneClasses,
              )}
            >
              <div className="flex flex-col gap-0.5">
                {toast.title && (
                  <div className="text-xs font-medium uppercase tracking-[0.1em]">
                    {toast.title}
                  </div>
                )}
                <div className="text-sm font-normal">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-pill p-1 text-xs opacity-70 hover:opacity-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
