import {
  Droplets,
  House,
  Landmark,
  Soup,
  Sprout,
  Sunset,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { VibeTag } from '@margi-ai/shared';

/** Display order of the mood picker, most requested first. */
export const VIBE_ORDER: readonly VibeTag[] = [
  'SPIRITUAL',
  'BEACH',
  'RICE_FIELDS',
  'WATERFALL',
  'NATURE',
  'SUNSET',
  'HERITAGE',
  'CULINARY',
];

export const VIBE_ICONS: Readonly<Record<VibeTag, LucideIcon>> = {
  SPIRITUAL: Landmark,
  NATURE: Trees,
  BEACH: Waves,
  RICE_FIELDS: Sprout,
  WATERFALL: Droplets,
  HERITAGE: House,
  SUNSET: Sunset,
  CULINARY: Soup,
};
