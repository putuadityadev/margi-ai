import type { ReactNode } from 'react';

/** Line illustrations for the four-step user flow; drawn with currentColor on a 120x80 canvas. */

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'square',
} as const;
const LIME = '#beff50';
const ASH = '#d2d2c8';
const CLASS = 'h-20 w-auto text-ink';

/** Step 1: a pin with the scan radius around it. */
export function PinRadius(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={CLASS}
    >
      <circle cx="60" cy="40" r="34" {...LINE} strokeDasharray="4 4" />
      <circle cx="60" cy="40" r="18" {...LINE} />
      <path
        d="M60 58 L50 38 a11 11 0 1 1 20 0 Z"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="60" cy="33" r="3.5" fill="currentColor" />
    </svg>
  );
}

/** Step 2: mood chips, one chosen. */
export function MoodChips(): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={CLASS}
    >
      <rect x="6" y="8" width="52" height="18" {...LINE} />
      <rect
        x="64"
        y="8"
        width="50"
        height="18"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect x="6" y="31" width="40" height="18" {...LINE} />
      <rect x="52" y="31" width="62" height="18" {...LINE} />
      <rect x="6" y="54" width="58" height="18" {...LINE} />
      <rect x="12" y="15" width="30" height="4" fill="currentColor" />
      <rect x="70" y="15" width="26" height="4" fill="currentColor" />
      <rect x="12" y="38" width="20" height="4" fill={ASH} />
      <rect x="58" y="38" width="36" height="4" fill={ASH} />
      <rect x="12" y="61" width="34" height="4" fill={ASH} />
    </svg>
  );
}

/** Step 3: a map with markers; the calm one is lime, the busy ones solid. */
export function CalmMap(): ReactNode {
  const busy: ReadonlyArray<readonly [number, number]> = [
    [16, 14],
    [92, 12],
    [30, 54],
    [98, 52],
  ];
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={CLASS}
    >
      <rect x="3" y="3" width="114" height="74" {...LINE} />
      <path
        d="M3 30 H117 M3 56 H117 M40 3 V77 M80 3 V77"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1"
        fill="none"
      />
      {busy.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="14" height="12" fill="currentColor" />
      ))}
      <rect
        x="52"
        y="28"
        width="22"
        height="16"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M63 44 v6" {...LINE} strokeWidth="2" />
    </svg>
  );
}

/** Step 4: a route with stops and a start button. */
export function PlanGo(): ReactNode {
  const stops: ReadonlyArray<readonly [number, number]> = [
    [14, 58],
    [48, 26],
    [86, 44],
  ];
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={CLASS}
    >
      <path d="M14 58 L48 26 L86 44 L108 14" {...LINE} strokeWidth="2" />
      {stops.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x - 6}
          y={y - 6}
          width="12"
          height="12"
          fill="#fff"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ))}
      <rect
        x="100"
        y="8"
        width="16"
        height="16"
        fill={LIME}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M105 12 L112 16 L105 20 Z" fill="currentColor" />
      <rect x="6" y="68" width="50" height="8" fill={ASH} />
    </svg>
  );
}
