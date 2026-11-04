import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Undo2 } from 'lucide-react';
import { gsap, useGSAP } from '../../lib/gsap';

export interface UndoToastProps {
  /** Log line of the change just applied; the toast restarts whenever it changes. */
  readonly change: string;
  readonly onUndo: () => void;
  readonly onDismiss: () => void;
}

/** How long the undo offer stays on screen, in ms. */
const UNDO_WINDOW_MS = 6000;

/** "Applied: … · Undo" bar with a draining timer line, shown after each applied suggestion. */
export function UndoToast({ change, onUndo, onDismiss }: UndoToastProps): ReactNode {
  const { t } = useTranslation('trip');
  const scope = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);

  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss.current(), UNDO_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [change]);

  useGSAP(
    () => {
      gsap.fromTo(
        '[data-drain]',
        { scaleX: 1 },
        { scaleX: 0, duration: UNDO_WINDOW_MS / 1000, ease: 'none' },
      );
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(scope.current, { y: 16, autoAlpha: 0, duration: 0.35, ease: 'power3.out' });
      });
    },
    { scope, dependencies: [change], revertOnUpdate: true },
  );

  return (
    <div
      ref={scope}
      role="status"
      className="pointer-events-auto relative overflow-hidden bg-ink text-white"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-body-sm">
          {t('undo.applied', { change })}
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="flex h-9 flex-none items-center gap-1.5 border border-lime px-3 text-body-sm text-lime hover:bg-lime hover:text-ink"
        >
          <Undo2 size={15} aria-hidden="true" />
          {t('undo.action')}
        </button>
      </div>
      <span
        data-drain
        className="absolute inset-x-0 bottom-0 block h-[2px] origin-left bg-lime"
        aria-hidden="true"
      />
    </div>
  );
}
