import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';
import { useMediaQuery } from '../../lib/useMediaQuery';

export interface BottomSheetProps {
  readonly children: ReactNode;
  /** Snap heights as fractions of the viewport, ascending (e.g. [0.3, 0.62, 0.94]). */
  readonly snaps: readonly number[];
  /** Index into `snaps` used when the sheet opens. */
  readonly initialSnap: number;
  /** Accessible name of the drag handle, e.g. "Resize panel". */
  readonly handleLabel: string;
  /** Reports the visible height in px so the map can keep its subject in view. */
  readonly onHeightChange?: (heightPx: number) => void;
  readonly label: string;
  /** Classes for the wide-screen (md+) panel, where the sheet becomes a static column. */
  readonly desktopClassName: string;
  readonly className?: string;
}

/** A flick faster than this (px per ms) jumps one snap in its direction. */
const FLICK_VELOCITY = 0.45;
/** Movement below this (px) counts as a tap, which cycles to the next snap. */
const TAP_SLOP_PX = 4;

function nearestSnapIndex(heightPx: number, snapsPx: readonly number[]): number {
  let best = 0;
  snapsPx.forEach((snap, index) => {
    if (Math.abs(snap - heightPx) < Math.abs((snapsPx[best] ?? 0) - heightPx)) best = index;
  });
  return best;
}

/**
 * Phone bottom sheet with snap points, dragged by its handle (or stepped with the arrow keys
 * on the focused handle). On md+ screens it renders as a static side panel instead.
 */
export function BottomSheet({
  children,
  snaps,
  initialSnap,
  handleLabel,
  onHeightChange,
  label,
  desktopClassName,
  className,
}: BottomSheetProps): ReactNode {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [snapIndex, setSnapIndex] = useState(initialSnap);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; lastY: number; lastT: number } | null>(
    null,
  );
  const moved = useRef(false);
  const viewport = typeof window === 'undefined' ? 800 : window.innerHeight;
  const snapsPx = snaps.map((fraction) => Math.round(fraction * viewport));
  const height = dragHeight ?? snapsPx[snapIndex] ?? snapsPx[0] ?? 0;

  useEffect(() => {
    if (!isDesktop && dragHeight === null) onHeightChange?.(height);
  }, [height, isDesktop, dragHeight, onHeightChange]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moved.current = false;
    drag.current = {
      startY: event.clientY,
      startHeight: height,
      lastY: event.clientY,
      lastT: event.timeStamp,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    if (!drag.current) return;
    const max = snapsPx[snapsPx.length - 1] ?? viewport;
    const min = (snapsPx[0] ?? 0) * 0.7;
    const travel = drag.current.startY - event.clientY;
    if (!moved.current && Math.abs(travel) < TAP_SLOP_PX) return;
    moved.current = true;
    const next = drag.current.startHeight + travel;
    drag.current.lastY = event.clientY;
    drag.current.lastT = event.timeStamp;
    setDragHeight(Math.min(max, Math.max(min, next)));
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>): void => {
    const state = drag.current;
    drag.current = null;
    if (!state || dragHeight === null) {
      setDragHeight(null);
      return;
    }
    const elapsed = Math.max(1, event.timeStamp - state.lastT + 16);
    const velocity = (state.lastY - event.clientY) / elapsed;
    let target = nearestSnapIndex(dragHeight, snapsPx);
    if (Math.abs(velocity) > FLICK_VELOCITY) {
      target = Math.min(snapsPx.length - 1, Math.max(0, snapIndex + (velocity > 0 ? 1 : -1)));
    }
    setSnapIndex(target);
    setDragHeight(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowUp') setSnapIndex((index) => Math.min(snapsPx.length - 1, index + 1));
    if (event.key === 'ArrowDown') setSnapIndex((index) => Math.max(0, index - 1));
  };
  const cycle = (): void => setSnapIndex((index) => (index + 1) % snapsPx.length);

  return (
    <section
      aria-label={label}
      style={isDesktop ? undefined : { height }}
      className={cn(
        'absolute inset-x-0 bottom-0 flex flex-col border-t border-ink bg-white',
        dragHeight === null &&
          'transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        desktopClassName,
        className,
      )}
    >
      {!isDesktop && (
        <button
          type="button"
          aria-label={handleLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onClick={() => {
            if (!moved.current) cycle();
          }}
          className="flex h-6 w-full flex-none cursor-grab touch-none items-center justify-center bg-white active:cursor-grabbing"
        >
          <span className="h-1 w-10 bg-ash" aria-hidden="true" />
        </button>
      )}
      {children}
    </section>
  );
}
