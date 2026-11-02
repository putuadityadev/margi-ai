import { classifyBusyness } from '@margi-ai/shared';

export const CROWD_COLORS = {
  low: '#2f9e5b',
  below: '#7cc142',
  avg: '#d9a400',
  above: '#ee7d1f',
  high: '#e0442b',
  surge: '#a8201a',
} as const;

export const CALM_THRESHOLD = 35;
export const RED_ZONE_THRESHOLD = 75;

export function getCrowdColor(bEff: number, isOrigin = false): string {
  if (bEff > 100) {
    return CROWD_COLORS.surge;
  }

  const key = classifyBusyness(bEff);

  if (isOrigin) {
    switch (key) {
      case 'high':
        return CROWD_COLORS.high;
      case 'above_average':
        return CROWD_COLORS.above;
      case 'average':
        return CROWD_COLORS.avg;
      case 'below_average':
        return CROWD_COLORS.below;
      case 'low':
      default:
        return CROWD_COLORS.low;
    }
  }

  // Alternative venue color scale (calm greens preferred)
  switch (key) {
    case 'low':
      return CROWD_COLORS.low;
    case 'below_average':
      return CROWD_COLORS.below;
    case 'average':
      return CROWD_COLORS.avg;
    case 'above_average':
      return CROWD_COLORS.above;
    case 'high':
    default:
      return CROWD_COLORS.high;
  }
}

export function getBusynessClassName(bEff: number): string {
  if (bEff > 100) return 'Surge';
  const key = classifyBusyness(bEff);
  switch (key) {
    case 'low':
      return 'Low';
    case 'below_average':
      return 'Below Average';
    case 'average':
      return 'Average';
    case 'above_average':
      return 'Above Average';
    case 'high':
      return 'High';
  }
}
