import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

type LngLat = readonly [number, number];

/** Equirectangular projection of the Bali bounding box onto the SVG canvas. */
const WEST = 114.4;
const NORTH = -8.04;
const SCALE = 600;
const VIEW_W = 800;
const VIEW_H = 490;

function project([lng, lat]: LngLat): [number, number] {
  return [(lng - WEST) * SCALE, (NORTH - lat) * SCALE];
}

function pathOf(points: readonly LngLat[]): string {
  return `${points
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ')} Z`;
}

/** Simplified Bali coastline, clockwise from Gilimanuk (longitude, latitude). */
const BALI_COAST: readonly LngLat[] = [
  [114.45, -8.15],
  [114.55, -8.14],
  [114.65, -8.13],
  [114.8, -8.17],
  [114.95, -8.18],
  [115.03, -8.16],
  [115.1, -8.11],
  [115.2, -8.07],
  [115.33, -8.12],
  [115.45, -8.18],
  [115.58, -8.27],
  [115.66, -8.34],
  [115.71, -8.4],
  [115.66, -8.46],
  [115.58, -8.5],
  [115.51, -8.53],
  [115.42, -8.56],
  [115.33, -8.59],
  [115.27, -8.66],
  [115.26, -8.71],
  [115.23, -8.75],
  [115.23, -8.79],
  [115.23, -8.82],
  [115.18, -8.85],
  [115.1, -8.84],
  [115.09, -8.8],
  [115.15, -8.76],
  [115.17, -8.74],
  [115.16, -8.7],
  [115.13, -8.65],
  [115.09, -8.62],
  [115.02, -8.51],
  [114.92, -8.46],
  [114.81, -8.42],
  [114.65, -8.4],
  [114.53, -8.37],
  [114.46, -8.3],
  [114.43, -8.22],
];
const NUSA_PENIDA: readonly LngLat[] = [
  [115.47, -8.69],
  [115.53, -8.67],
  [115.61, -8.71],
  [115.62, -8.76],
  [115.57, -8.81],
  [115.49, -8.8],
  [115.45, -8.75],
];
const NUSA_LEMBONGAN: readonly LngLat[] = [
  [115.43, -8.665],
  [115.46, -8.665],
  [115.465, -8.695],
  [115.43, -8.7],
];

/** Well-known places drawn as quiet background dots. */
const PLACES: readonly LngLat[] = [
  [115.262, -8.507],
  [115.262, -8.69],
  [115.025, -8.16],
  [115.66, -8.34],
  [115.07, -8.26],
  [115.36, -8.25],
  [115.18, -8.17],
  [115.36, -8.42],
  [115.36, -8.445],
  [114.65, -8.14],
  [114.81, -8.42],
  [115.57, -8.51],
  [115.44, -8.47],
  [115.45, -8.374],
  [115.587, -8.412],
  [115.167, -8.81],
  [115.13, -8.65],
  [115.13, -8.19],
  [114.98, -8.33],
  [115.31, -8.36],
];

/** Hotspot → calmer alternative with a shared mood (same pairs the explore engine ranks). */
const REROUTES: readonly { from: LngLat; to: LngLat; label: string }[] = [
  { from: [115.087, -8.621], to: [115.018, -8.503], label: 'Pantai Balian' },
  { from: [115.279, -8.435], to: [115.135, -8.37], label: 'Jatiluwih' },
  { from: [115.631, -8.392], to: [115.631, -8.463], label: 'Taman Ujung' },
  { from: [115.166, -8.275], to: [115.098, -8.258], label: 'Danau Tamblingan' },
  { from: [115.473, -8.751], to: [115.616, -8.774], label: 'Pantai Atuh' },
];

function arcPath(from: LngLat, to: LngLat): string {
  const [x1, y1] = project(from);
  const [x2, y2] = project(to);
  const cx = (x1 + x2) / 2 - (y2 - y1) * 0.5;
  const cy = (y1 + y2) / 2 + (x2 - x1) * 0.5 - 40;
  return `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
}

function Square({
  at,
  size,
  className,
  data,
}: {
  at: LngLat;
  size: number;
  className: string;
  data?: string;
}): ReactNode {
  const [x, y] = project(at);
  return (
    <rect
      {...(data ? { [data]: '' } : {})}
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      className={className}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
  );
}

export interface BaliPulseMapProps {
  readonly label: string;
  readonly className?: string;
}

/**
 * Hero illustration: Bali's outline draws itself, hotspots pulse in ink, and
 * routes arc out to calmer places in lime, one after another.
 */
export function BaliPulseMap({ label, className }: BaliPulseMapProps): ReactNode {
  const scope = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const svg = scope.current;
      if (!svg) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const coast = svg.querySelectorAll<SVGPathElement>('[data-coast]');
        coast.forEach((path) => {
          const length = path.getTotalLength?.() ?? 2400;
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        });
        const intro = gsap.timeline({ delay: 0.3 });
        intro
          .to(coast, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' })
          .from(
            '[data-dot]',
            { scale: 0, duration: 0.4, ease: 'back.out(3)', stagger: 0.03 },
            '-=1.2',
          )
          .from(
            '[data-hot]',
            { scale: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.08 },
            '-=0.4',
          );

        gsap.to('[data-hot]', {
          scale: 1.5,
          duration: 0.9,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          stagger: 0.2,
          delay: 2.6,
        });

        const loop = gsap.timeline({ repeat: -1, delay: 3 });
        svg.querySelectorAll<SVGGElement>('[data-reroute]').forEach((group) => {
          const arc = group.querySelector<SVGPathElement>('path');
          const length = arc?.getTotalLength?.() ?? 300;
          const pin = group.querySelectorAll('[data-calm], [data-calm-label]');
          loop
            .fromTo(
              arc,
              { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 1 },
              {
                strokeDashoffset: 0,
                duration: 1,
                ease: 'power2.inOut',
              },
            )
            .fromTo(
              pin,
              { autoAlpha: 0, scale: 0.4 },
              { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)' },
            )
            .to({}, { duration: 1.1 })
            .to([arc, ...pin], { autoAlpha: 0, duration: 0.35 });
        });
      });
    },
    { scope },
  );

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      className={className}
    >
      <path
        data-coast
        d={pathOf(BALI_COAST)}
        fill="var(--color-white)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      <path
        data-coast
        d={pathOf(NUSA_PENIDA)}
        fill="var(--color-white)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      <path
        data-coast
        d={pathOf(NUSA_LEMBONGAN)}
        fill="var(--color-white)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      {PLACES.map((place) => (
        <Square key={place.join()} at={place} size={6} className="fill-ash" data="data-dot" />
      ))}
      {REROUTES.map((route) => (
        <Square key={route.label} at={route.from} size={11} className="fill-ink" data="data-hot" />
      ))}
      {REROUTES.map((route) => {
        const [x, y] = project(route.to);
        return (
          <g key={`r-${route.label}`} data-reroute>
            <path
              d={arcPath(route.from, route.to)}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="2"
              style={{ visibility: 'hidden' }}
            />
            <rect
              data-calm
              x={x - 8}
              y={y - 8}
              width="16"
              height="16"
              fill="var(--color-lime)"
              stroke="var(--color-ink)"
              strokeWidth="2"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', visibility: 'hidden' }}
            />
            <g data-calm-label style={{ visibility: 'hidden' }}>
              <rect
                x={x + 14}
                y={y - 11}
                width={route.label.length * 7.4 + 14}
                height="22"
                fill="var(--color-ink)"
              />
              <text
                x={x + 21}
                y={y + 4}
                fill="var(--color-white)"
                fontFamily="var(--font-mono)"
                fontSize="12"
              >
                {route.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
