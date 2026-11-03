import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { gsap, useGSAP } from '../../lib/gsap';

/** Expression of the MARGI avatar; drives eyes and the processing rings. */
export type AvatarMood = 'idle' | 'thinking' | 'happy' | 'error';

export interface MargiAvatarProps {
  readonly mood?: AvatarMood;
  /** Rendered size in px; the drawing scales from a 64-unit square. */
  readonly size?: number;
  /** Follow the pointer with the eyes while idle. Off for tiny inline avatars. */
  readonly tracking?: boolean;
  readonly className?: string;
}

/** Furthest the pupils travel from centre, in viewBox units. */
const GAZE_RANGE = 4.5;
/** Pointer distance (px) at which the gaze reaches its full range. */
const GAZE_FULL_AT_PX = 280;
const BLINK_MIN_S = 2.4;
const BLINK_MAX_S = 5.6;

/**
 * MARGI's face: a lime square with two ink eyes. Idle eyes follow the pointer and blink,
 * thinking eyes scan while square rings ripple outward, happy eyes close into arcs, and
 * error eyes flatten. Decorative; the surrounding UI always states the same thing in text.
 */
export function MargiAvatar({
  mood = 'idle',
  size = 40,
  tracking = true,
  className,
}: MargiAvatarProps): ReactNode {
  const root = useRef<SVGSVGElement>(null);
  const gaze = useRef<SVGGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(root.current, { scale: 0.85, duration: 0.45, ease: 'back.out(2.4)' });

        if (mood === 'idle') {
          // A function-based pause, refreshed every loop, keeps the blink rhythm irregular.
          gsap
            .timeline({ repeat: -1, repeatRefresh: true })
            .to({}, { duration: () => gsap.utils.random(BLINK_MIN_S, BLINK_MAX_S) })
            .to('[data-eye]', { scaleY: 0.12, duration: 0.07, ease: 'power1.in' })
            .to('[data-eye]', { scaleY: 1, duration: 0.12, ease: 'power1.out' });
        }

        if (mood === 'thinking') {
          gsap
            .timeline({ repeat: -1, defaults: { duration: 0.42, ease: 'power2.inOut' } })
            .to(gaze.current, { x: -GAZE_RANGE, y: -2.5 })
            .to(gaze.current, { x: GAZE_RANGE, y: -2.5 }, '+=0.25')
            .to(gaze.current, { x: 0, y: 1.5 }, '+=0.25')
            .to('[data-eye]', { scaleY: 0.5, duration: 0.12, yoyo: true, repeat: 1 });
          gsap.fromTo(
            '[data-ring]',
            { scale: 1, autoAlpha: 0.9 },
            {
              scale: 1.55,
              autoAlpha: 0,
              duration: 1.4,
              ease: 'power2.out',
              stagger: 0.7,
              repeat: -1,
            },
          );
          gsap.to('[data-orbit]', {
            rotation: 360,
            duration: 2.2,
            ease: 'none',
            repeat: -1,
            transformOrigin: '32px 32px',
          });
          gsap.to('[data-body]', {
            scale: 1.03,
            duration: 0.7,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
            transformOrigin: 'center',
          });
        }

        if (mood === 'happy') {
          gsap.fromTo(
            root.current,
            { y: 0 },
            { y: -4, duration: 0.18, yoyo: true, repeat: 3, ease: 'power1.out' },
          );
        }

        if (mood === 'error') {
          gsap.fromTo(
            root.current,
            { x: -2 },
            { x: 2, duration: 0.06, yoyo: true, repeat: 5, ease: 'none', clearProps: 'x' },
          );
        }
      });
    },
    { scope: root, dependencies: [mood], revertOnUpdate: true },
  );

  // Gaze follows the pointer anywhere on the page while idle.
  useEffect(() => {
    const node = root.current;
    const eyes = gaze.current;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!node || !eyes || !tracking || mood !== 'idle' || reduced) return;
    const toX = gsap.quickTo(eyes, 'x', { duration: 0.35, ease: 'power3.out' });
    const toY = gsap.quickTo(eyes, 'y', { duration: 0.35, ease: 'power3.out' });
    const onMove = (event: PointerEvent): void => {
      const box = node.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const reach = Math.min(1, Math.hypot(dx, dy) / GAZE_FULL_AT_PX);
      const angle = Math.atan2(dy, dx);
      toX(Math.cos(angle) * GAZE_RANGE * reach);
      toY(Math.sin(angle) * GAZE_RANGE * reach);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [tracking, mood]);

  const thinking = mood === 'thinking';

  return (
    <svg
      ref={root}
      viewBox="-8 -8 80 80"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn('flex-none overflow-visible', className)}
    >
      {thinking && (
        <>
          <rect
            data-ring
            x="2"
            y="2"
            width="60"
            height="60"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            style={{ transformOrigin: '32px 32px' }}
          />
          <rect
            data-ring
            x="2"
            y="2"
            width="60"
            height="60"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            style={{ transformOrigin: '32px 32px' }}
          />
          <g data-orbit>
            <rect x="29" y="-6" width="6" height="6" fill="var(--color-ink)" />
          </g>
        </>
      )}
      <rect
        data-body
        x="2"
        y="2"
        width="60"
        height="60"
        fill="var(--color-lime)"
        stroke="var(--color-ink)"
        strokeWidth="3"
      />
      <g ref={gaze}>
        {mood === 'happy' ? (
          <g fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="square">
            <path d="M16 33 l6 -6 l6 6" />
            <path d="M36 33 l6 -6 l6 6" />
          </g>
        ) : mood === 'error' ? (
          <g fill="var(--color-ink)">
            <rect x="15" y="29" width="14" height="4" />
            <rect x="35" y="29" width="14" height="4" />
          </g>
        ) : (
          <g fill="var(--color-ink)">
            <rect
              data-eye
              x="17"
              y="22"
              width="9"
              height="15"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            <rect
              data-eye
              x="38"
              y="22"
              width="9"
              height="15"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          </g>
        )}
      </g>
    </svg>
  );
}
