import type { ReactNode } from 'react';
import { Polyline } from 'react-leaflet';
import type { Corridor } from '@margi-ai/shared';
import { CROWD_COLORS } from './crowdScale';

export interface CorridorLineProps {
  readonly corridor: Corridor;
  /** True when the corridor's penalty window delays a leg of the current trip. */
  readonly isActive: boolean;
}

/** Gridlock corridor drawn as a thick translucent band; active ones pulse in the high-crowd colour. */
export function CorridorLine({ corridor, isActive }: CorridorLineProps): ReactNode {
  return (
    <Polyline
      positions={corridor.path.map((point) => [point.lat, point.lng])}
      interactive={false}
      pathOptions={{
        color: isActive ? CROWD_COLORS.high : CROWD_COLORS.above,
        weight: isActive ? 12 : 8,
        opacity: isActive ? 0.55 : 0.28,
        lineCap: 'square',
        className: isActive ? 'trip-corridor trip-corridor--active' : 'trip-corridor',
      }}
    />
  );
}
