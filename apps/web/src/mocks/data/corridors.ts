import { CorridorSchema, type Corridor, type PenaltyWindow } from '@margi-ai/shared';

/** WITA day numbers, 0 = Monday ... 6 = Sunday (packages/shared/time). */
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [5, 6];

function penaltyWindow(days: readonly number[], start: string, end: string): PenaltyWindow {
  return { days: [...days], start, end };
}

/**
 * Gridlock-prone road segments from the BRD §7.2 corridor list. Delays are typical extra
 * minutes when a leg is driven inside an active penalty window; windows are WITA.
 * Direction-specific jams (the Sanur bypass northbound morning) are modelled for both
 * directions because the mock has no routing engine.
 */
const rawCorridors: Corridor[] = [
  {
    id: 'ubud-raya',
    nameEn: 'Ubud main road (Jl. Raya Ubud)',
    nameId: 'Jl. Raya Ubud',
    centerLat: -8.5069,
    centerLng: 115.2625,
    radiusMeters: 1500,
    typicalDelayMinutes: 45,
    penaltyWindows: [penaltyWindow(EVERY_DAY, '10:00', '21:00')],
    path: [
      { lat: -8.5055, lng: 115.2535 },
      { lat: -8.5063, lng: 115.258 },
      { lat: -8.5069, lng: 115.2625 },
      { lat: -8.5085, lng: 115.268 },
      { lat: -8.511, lng: 115.273 },
    ],
  },
  {
    id: 'canggu-batu-bolong-berawa',
    nameEn: 'Canggu shortcut roads (Batu Bolong and Berawa)',
    nameId: 'Jalan pintas Canggu (Batu Bolong dan Berawa)',
    centerLat: -8.6478,
    centerLng: 115.1385,
    radiusMeters: 1500,
    typicalDelayMinutes: 30,
    penaltyWindows: [penaltyWindow(EVERY_DAY, '15:30', '19:00')],
    path: [
      { lat: -8.6595, lng: 115.1302 },
      { lat: -8.653, lng: 115.1335 },
      { lat: -8.6478, lng: 115.1385 },
      { lat: -8.651, lng: 115.144 },
      { lat: -8.6605, lng: 115.146 },
    ],
  },
  {
    id: 'sanur-bypass',
    nameEn: 'Sanur bypass (Jl. Bypass Ngurah Rai)',
    nameId: 'Jl. Bypass Ngurah Rai Sanur',
    centerLat: -8.69,
    centerLng: 115.256,
    radiusMeters: 2000,
    typicalDelayMinutes: 20,
    penaltyWindows: [
      penaltyWindow(EVERY_DAY, '07:00', '09:00'),
      penaltyWindow(WEEKEND, '15:00', '19:00'),
    ],
    path: [
      { lat: -8.66, lng: 115.256 },
      { lat: -8.675, lng: 115.258 },
      { lat: -8.69, lng: 115.256 },
      { lat: -8.705, lng: 115.25 },
      { lat: -8.72, lng: 115.238 },
    ],
  },
  {
    id: 'kuta-legian',
    nameEn: 'Kuta to Legian (Jl. Legian)',
    nameId: 'Kuta ke Legian (Jl. Legian)',
    centerLat: -8.71,
    centerLng: 115.17,
    radiusMeters: 1200,
    typicalDelayMinutes: 25,
    penaltyWindows: [penaltyWindow(EVERY_DAY, '16:00', '22:00')],
    path: [
      { lat: -8.72, lng: 115.172 },
      { lat: -8.715, lng: 115.171 },
      { lat: -8.71, lng: 115.17 },
      { lat: -8.703, lng: 115.1685 },
      { lat: -8.695, lng: 115.168 },
    ],
  },
  {
    id: 'tegallalang-raya',
    nameEn: 'Tegallalang main road (Jl. Raya Tegallalang)',
    nameId: 'Jl. Raya Tegallalang',
    centerLat: -8.433,
    centerLng: 115.279,
    radiusMeters: 1200,
    typicalDelayMinutes: 20,
    penaltyWindows: [penaltyWindow(EVERY_DAY, '09:00', '15:00')],
    path: [
      { lat: -8.46, lng: 115.277 },
      { lat: -8.445, lng: 115.278 },
      { lat: -8.433, lng: 115.279 },
      { lat: -8.42, lng: 115.28 },
    ],
  },
  {
    id: 'uluwatu-pecatu',
    nameEn: 'Uluwatu road through Pecatu (Jl. Raya Uluwatu)',
    nameId: 'Jl. Raya Uluwatu, Pecatu',
    centerLat: -8.8,
    centerLng: 115.12,
    radiusMeters: 2000,
    typicalDelayMinutes: 20,
    penaltyWindows: [penaltyWindow(EVERY_DAY, '16:00', '19:00')],
    path: [
      { lat: -8.788, lng: 115.158 },
      { lat: -8.796, lng: 115.14 },
      { lat: -8.8, lng: 115.12 },
      { lat: -8.81, lng: 115.105 },
      { lat: -8.823, lng: 115.09 },
    ],
  },
];

/** Corridors served by `GET /explore/corridors` and used by the trip engine. */
export const MOCK_CORRIDORS: readonly Corridor[] = rawCorridors.map((corridor) =>
  CorridorSchema.parse(corridor),
);
