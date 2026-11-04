import type { ReactNode } from 'react';

/**
 * Small line diagrams for the bento cells. They are drawn with currentColor so each cell sets
 * its own ink, and every shape carries a data attribute the page can animate once on entry.
 */

const UNEVEN = [18, 92, 26, 14, 64, 22, 86, 12, 20, 58, 24, 16];

/** Twelve bars, two towering: the crowd is not spread evenly. */
export function UnevenBars({ label }: { readonly label: string }): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      role="img"
      aria-label={label}
      className="h-24 w-full text-ink"
    >
      <line x1="0" y1="89" x2="240" y2="89" stroke="currentColor" strokeWidth="1.5" />
      {UNEVEN.map((value, index) => (
        <rect
          key={index}
          data-bar
          x={index * 20 + 3}
          y={88 - value * 0.9}
          width="14"
          height={value * 0.9}
          fill={value > 55 ? 'currentColor' : '#d2d2c8'}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        />
      ))}
    </svg>
  );
}

const DAY = [14, 24, 40, 62, 84, 96, 88, 66, 38, 22, 16, 20, 34, 52, 40, 22];
const QUIET = new Set([8, 9, 10, 11]);

/** A day of crowd: it builds, peaks, and leaves a calm window (lime). */
export function ForecastBars({ label }: { readonly label: string }): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      role="img"
      aria-label={label}
      className="h-24 w-full text-white"
    >
      <line
        x1="0"
        y1="89"
        x2="240"
        y2="89"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      {DAY.map((value, index) => (
        <rect
          key={index}
          data-bar
          x={index * 15 + 2}
          y={88 - value * 0.88}
          width="11"
          height={value * 0.88}
          fill={QUIET.has(index) ? '#beff50' : 'currentColor'}
          fillOpacity={QUIET.has(index) ? 1 : 0.3}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        />
      ))}
    </svg>
  );
}

/** A route between two stops with a short congested stretch marked. */
export function RoutePath({ label }: { readonly label: string }): ReactNode {
  return (
    <svg
      preserveAspectRatio="xMinYMid meet"
      viewBox="0 0 240 90"
      role="img"
      aria-label={label}
      className="h-24 w-full text-white"
    >
      <path
        data-route
        d="M14 70 C 60 70, 70 24, 118 30 S 176 66, 224 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <path
        d="M92 34 C 100 28, 108 28, 118 30"
        fill="none"
        stroke="#beff50"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <rect
        x="8"
        y="64"
        width="12"
        height="12"
        fill="#beff50"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="218"
        y="14"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
