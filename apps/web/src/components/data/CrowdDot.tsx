import type { ReactNode } from 'react';
import { getCrowdColor } from './crowdScale';

export interface CrowdDotProps {
  readonly busynessPct: number;
  readonly isOpen?: boolean;
}

/** Square crowd swatch; decorative, so the adjacent text must state the level. */
export function CrowdDot({ busynessPct, isOpen = true }: CrowdDotProps): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 flex-none"
      style={{ backgroundColor: isOpen ? getCrowdColor(busynessPct) : 'var(--color-stone)' }}
    />
  );
}
