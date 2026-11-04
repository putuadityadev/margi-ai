import type { ReactNode } from 'react';

/** Line illustrations for the how-it-works and benefits grids; they draw with currentColor. */

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'square',
} as const;
const LIME = '#beff50';
const ASH = '#d2d2c8';

const SMALL = 'h-20 w-auto text-ink';
const WIDE = 'h-24 w-full text-ink';

/** The guard: a figure that is allowed (tick) and one that is thrown out (cross). */
export function CheckGate({ className = SMALL }: { readonly className?: string }): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={className}
    >
      <rect x="6" y="8" width="108" height="26" {...LINE} />
      <rect x="12" y="17" width="52" height="8" fill="currentColor" />
      <path d="M84 20 l6 7 l12 -12" {...LINE} strokeWidth="2.4" />
      <rect x="6" y="46" width="108" height="26" {...LINE} strokeDasharray="4 3" />
      <rect x="12" y="55" width="40" height="8" fill="currentColor" fillOpacity="0.25" />
      <path d="M88 54 l16 14 M104 54 l-16 14" {...LINE} strokeWidth="2.4" />
    </svg>
  );
}

/** Benefit: a queue shortened by knowing the quiet hour. */
export function QueueClock(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <rect
          key={index}
          x={6 + index * 14}
          y={50}
          width="8"
          height="24"
          fill={index > 5 ? ASH : 'currentColor'}
        />
      ))}
      <line x1="4" y1="76" x2="136" y2="76" {...LINE} />
      <circle cx="196" cy="42" r="30" fill={LIME} stroke="currentColor" strokeWidth="1.8" />
      <path d="M196 22 V42 L210 50" {...LINE} strokeWidth="2.2" />
    </svg>
  );
}

/** Benefit: the busy place and its calm twin side by side. */
export function TwinBars(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      <rect x="6" y="6" width="104" height="78" {...LINE} />
      <rect x="130" y="6" width="104" height="78" {...LINE} />
      <rect x="16" y="16" width="84" height="12" fill={ASH} />
      <rect x="16" y="16" width="78" height="12" fill="currentColor" />
      <rect x="140" y="16" width="84" height="12" fill={ASH} />
      <rect
        x="140"
        y="16"
        width="28"
        height="12"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M16 62 q20 -22 40 -8 t44 4" {...LINE} strokeLinecap="round" />
      <path d="M140 62 q20 -22 40 -8 t44 4" {...LINE} strokeLinecap="round" />
    </svg>
  );
}

/** Benefit: a route that dodges a jam by a side road. */
export function JamRoute(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      <path d="M10 70 H90 L130 30 H230" {...LINE} strokeWidth="2" />
      <path d="M90 70 H150 L230 70" {...LINE} strokeDasharray="5 4" />
      <rect
        x="96"
        y="62"
        width="26"
        height="14"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="4"
        y="64"
        width="12"
        height="12"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="224"
        y="24"
        width="12"
        height="12"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** Benefit: a family warung with an awning along the route. */
export function Warung(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <rect
          key={index}
          x={50 + index * 24}
          y="18"
          width="24"
          height="18"
          fill={index % 2 ? '#fff' : LIME}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
      <rect x="54" y="36" width="132" height="42" {...LINE} />
      <rect x="104" y="50" width="32" height="28" {...LINE} />
      <line x1="30" y1="78" x2="210" y2="78" {...LINE} />
    </svg>
  );
}

/** Benefit: a figure that carries its source, ticked. */
export function SourceTick(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      <rect x="10" y="14" width="150" height="62" {...LINE} />
      <rect x="22" y="26" width="64" height="10" fill="currentColor" />
      <rect x="22" y="46" width="110" height="6" fill={ASH} />
      <rect x="22" y="58" width="80" height="6" fill={ASH} />
      <rect
        x="176"
        y="22"
        width="52"
        height="52"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M188 48 l10 10 l18 -20" {...LINE} strokeWidth="3" />
    </svg>
  );
}

/** Benefit: change a stop and the trip redraws. */
export function Recalc(): ReactNode {
  const stops: ReadonlyArray<readonly [number, number]> = [
    [12, 66],
    [70, 28],
    [128, 20],
    [186, 62],
  ];
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      aria-hidden="true"
      className={WIDE}
    >
      <path d="M12 66 L70 28 L128 58 L186 22" {...LINE} strokeWidth="1.8" strokeDasharray="5 4" />
      <path d="M12 66 L70 28 L128 20 L186 62" {...LINE} strokeWidth="2.2" />
      {stops.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x - 6}
          y={y - 6}
          width="12"
          height="12"
          fill={x === 128 ? LIME : '#fff'}
          stroke="currentColor"
          strokeWidth="1.6"
        />
      ))}
      <path d="M216 40 a16 16 0 1 1 -6 -12" {...LINE} strokeWidth="2" />
    </svg>
  );
}
