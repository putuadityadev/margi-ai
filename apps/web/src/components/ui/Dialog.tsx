import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../../lib/cn';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDialogElement>;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  ref: externalRef,
}: DialogProps): ReactNode {
  const internalRef = useRef<HTMLDialogElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = internalRef.current;
    if (!dialog) return;

    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    } else {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      }
      if (triggerElementRef.current) {
        triggerElementRef.current.focus();
        triggerElementRef.current = null;
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>): void => {
    e.preventDefault();
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  // Close on backdrop click
  const handleClick = (e: MouseEvent<HTMLDialogElement>): void => {
    const dialog = internalRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };

  return (
    <dialog
      ref={(el) => {
        internalRef.current = el;
        if (typeof externalRef === 'function') {
          externalRef(el);
        } else if (externalRef) {
          (externalRef as { current: HTMLDialogElement | null }).current = el;
        }
      }}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
      className={cn(
        'm-auto rounded-card bg-white p-6 md:p-8 border border-ash text-ink max-w-lg w-full',
        'backdrop:bg-ink/50 backdrop:backdrop-blur-xs',
        'focus-visible:outline-none',
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-xl font-medium tracking-tight text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-description" className="mt-1 text-xs text-graphite">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-pill p-1.5 text-graphite hover:text-ink hover:bg-parchment transition cursor-pointer"
          >
            <span aria-hidden="true" className="text-sm">
              ✕
            </span>
          </button>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </dialog>
  );
}
