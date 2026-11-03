import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Maximize2,
  Pause,
  Play,
  X,
} from 'lucide-react';

export interface GlassyCarouselItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  accent?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  trailerUrl?: string;
  bEff?: number;
  tag?: string;
}

export interface GlassyCarouselProps {
  items: GlassyCarouselItem[];
  initialIndex?: number;
  layout?: 'website' | 'poster';
  interval?: number;
  autoPlay?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onSelect?: (item: GlassyCarouselItem, index: number) => void;
  onAction?: (item: GlassyCarouselItem) => void;
  actionLabel?: string;
}

const wrap = (value: number, length: number): number =>
  ((value % length) + length) % length;

export function GlassyCarousel({
  items,
  initialIndex = 0,
  layout = 'website',
  interval = 6000,
  autoPlay = false,
  label = 'Koleksi Destinasi Bali',
  className = '',
  style,
  onSelect,
  onAction,
  actionLabel = '✦ Cek Kepadatan MARGI AI',
}: GlassyCarouselProps): ReactNode {
  const [index, setIndex] = useState(
    Number.isFinite(initialIndex) ? Math.trunc(initialIndex) : 0,
  );
  const [playing, setPlaying] = useState(autoPlay);
  const [reduced, setReduced] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 380 });
  const [preview, setPreview] = useState<GlassyCarouselItem | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    time: number;
    horizontal: boolean;
  } | null>(null);
  const suppressClickUntil = useRef(0);
  const focusSelection = useRef(false);
  const id = useId();

  const activeIndex = items.length ? wrap(index, items.length) : 0;
  const active = items[activeIndex];

  const cardWidth =
    layout === 'poster'
      ? Math.min(260, stageSize.width * 0.55, Math.max(140, (stageSize.height - 28) / 1.4))
      : Math.min(380, stageSize.width * 0.74);

  const step = cardWidth * 0.76;
  const running =
    playing &&
    !reduced &&
    !preview &&
    !dragging &&
    pageVisible &&
    !hovered &&
    !cardFocused &&
    items.length > 1;

  const duration = Number.isFinite(interval) ? Math.max(2500, interval) : 6000;
  const before = Math.min(2, Math.floor((items.length - 1) / 2));
  const after = Math.min(2, Math.ceil((items.length - 1) / 2));

  const slots =
    items.length > 1
      ? Array.from(
          { length: before + after + 3 },
          (_, position) => index + position - before - 1,
        )
      : [index];

  useEffect(() => setPlaying(autoPlay), [autoPlay]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    const measure = (): void => {
      if (stage.current) {
        setStageSize({
          width: stage.current.clientWidth,
          height: stage.current.clientHeight,
        });
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    const update = (): void => setPageVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((current) => current + 1), duration);
    return () => clearTimeout(timer);
  }, [running, index, duration]);

  const select = (next: number): void => {
    setIndex(next);
    setDrag(0);
    const item = items[wrap(next, items.length)];
    if (item) {
      onSelect?.(item, wrap(next, items.length));
    }
  };

  const open = (item: GlassyCarouselItem): void => {
    if (performance.now() > suppressClickUntil.current) {
      setPreview(item);
    }
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      horizontal: false,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const start = gesture.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null;
      return;
    }
    if (!start.horizontal && Math.abs(dx) > 8) {
      start.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    if (start.horizontal) {
      setDrag(Math.max(-1.2, Math.min(1.2, dx / step)));
    }
  };

  const pointerUp = (
    event: PointerEvent<HTMLDivElement>,
    cancel = false,
  ): void => {
    const start = gesture.current;
    gesture.current = null;
    if (start?.horizontal) {
      const dx = event.clientX - start.x;
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - start.time);
      if (
        !cancel &&
        (Math.abs(dx) > Math.min(55, cardWidth * 0.18) ||
          (Math.abs(dx) > 14 && velocity > 0.35))
      ) {
        setIndex((current) => current + (dx < 0 ? 1 : -1));
      }
      suppressClickUntil.current = performance.now() + 300;
    }
    setDrag(0);
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!active) return null;

  return (
    <section
      data-layout={layout}
      className={`relative w-full border border-ash/80 bg-parchment-card p-3 sm:p-5 select-none overflow-hidden ${className}`}
      aria-label={label}
      aria-roledescription="carousel"
      style={style}
      onKeyDown={(event) => {
        if (preview || event.altKey || event.ctrlKey || event.metaKey) return;
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
          focusSelection.current =
            (event.target as HTMLElement).closest('.gc-card') !== null;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          select(index + 1);
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          select(index - 1);
        }
        if (event.key === 'Home') {
          event.preventDefault();
          select(0);
        }
        if (event.key === 'End') {
          event.preventDefault();
          select(items.length - 1);
        }
      }}
    >
      {/* 3D Coverflow Stage */}
      <div
        className="relative h-64 sm:h-72 w-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
        ref={stage}
        data-dragging={dragging || undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerUp(event)}
        onPointerCancel={(event) => pointerUp(event, true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setCardFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setCardFocused(false);
          }
        }}
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
      >
        {slots.map((slot) => {
          const item = items[wrap(slot, items.length)];
          if (!item) return null;
          const d = slot - index;
          const offset = d + drag;
          const abs = Math.abs(offset);
          const x = offset * step;
          const selected = slot === index;

          return (
            <button
              key={slot}
              type="button"
              className={`gc-card absolute text-left rounded-none border transition-all cursor-pointer overflow-hidden p-1 bg-white ${
                selected ? 'border-2 border-ink' : 'border border-ash/80 opacity-85'
              }`}
              data-active={selected || undefined}
              tabIndex={selected ? 0 : -1}
              aria-label={item.title}
              aria-current={selected ? 'true' : undefined}
              aria-hidden={d < -before || d > after || undefined}
              onClick={() => {
                if (performance.now() < suppressClickUntil.current) return;
                select(index + d);
                onAction?.(item);
              }}
              style={{
                width: `${cardWidth}px`,
                transform: `translate3d(${x}px, 0, ${
                  -Math.min(abs, 3) * 110
                }px) rotateY(${-Math.max(-38, Math.min(38, offset * 26))}deg) scale(${
                  1 - Math.min(abs, 3) * 0.08
                })`,
                opacity: d < -before || d > after ? 0 : 1,
                zIndex: 10 - Math.abs(d),
                pointerEvents: d < -before || d > after ? 'none' : undefined,
              }}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-parchment border border-ash/70">
                <img
                  src={item.image}
                  alt={item.title}
                  draggable={false}
                  loading={Math.abs(d) < 2 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover block"
                />
                {item.tag ? (
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-ink text-parchment text-[9px] font-medium uppercase tracking-wider">
                    {item.tag}
                  </span>
                ) : null}
                {item.bEff !== undefined ? (
                  <span
                    className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-medium border ${
                      item.bEff > 70
                        ? 'bg-charcoal text-white border-white/50'
                        : 'bg-lime text-ink border-ink'
                    }`}
                  >
                    ● {item.bEff}%
                  </span>
                ) : null}
              </div>

              <div className="p-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <strong className="block text-xs font-medium text-ink truncate">
                    {item.title}
                  </strong>
                  <ArrowUpRight size={13} className="text-graphite shrink-0" />
                </div>
                <span className="block text-[11px] text-graphite truncate">
                  {item.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Spot Bottom Bar with Direct MARGI AI Action */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-ash/70">
        <div className="text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-graphite">
              TERPILIH:
            </span>
            <strong className="text-xs sm:text-sm font-medium text-ink truncate">
              {active.title}
            </strong>
          </div>
          <p className="text-[11px] text-graphite truncate">{active.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Coverflow Navigation Buttons */}
          <div className="flex items-center gap-1 border border-ash/80 bg-white p-0.5">
            <button
              type="button"
              onClick={() => select(index - 1)}
              aria-label="Destinasi sebelumnya"
              className="p-1.5 hover:bg-parchment text-ink transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-[11px] font-medium tabular-nums text-graphite">
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(items.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => select(index + 1)}
              aria-label="Destinasi selanjutnya"
              className="p-1.5 hover:bg-parchment text-ink transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Primary Action Button */}
          {onAction ? (
            <button
              type="button"
              onClick={() => onAction(active)}
              className="px-3 py-1.5 bg-lime text-ink text-xs font-medium border border-ink hover:brightness-105 active:scale-[0.99] transition cursor-pointer"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>

      {/* Detail Dialog Modal */}
      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto z-50 p-4 bg-white border-2 border-ink text-ink rounded-none max-w-lg w-full backdrop:bg-charcoal/70"
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPreview(null);
        }}
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-ash/70 pb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-graphite">
                PRATINJAU DESTINASI
              </span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-xs font-medium px-2 py-0.5 border border-ash/80 hover:bg-parchment cursor-pointer"
              >
                <X size={13} className="inline mr-1" />
                Tutup
              </button>
            </div>

            <div className="aspect-[16/9] w-full overflow-hidden border border-ink bg-parchment">
              <img
                src={preview.image}
                alt={preview.title}
                className="w-full h-full object-cover block"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-medium text-ink">
                {preview.title}
              </h2>
              <span className="text-xs text-graphite block">{preview.subtitle}</span>
              <p className="text-xs text-graphite leading-relaxed pt-1">
                {preview.description || preview.subtitle}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-ash/70">
              {onAction && (
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    onAction(preview);
                  }}
                  className="px-4 py-2 bg-lime text-ink text-xs font-medium border border-ink hover:brightness-105 transition cursor-pointer"
                >
                  {actionLabel} →
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

export default GlassyCarousel;
