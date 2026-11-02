import { CreatePresetInputSchema, type CreatePresetInput } from '@margi-ai/shared';

const rawPresets: CreatePresetInput[] = [
  {
    id: 'lempuyang-morning',
    originVenueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f010',
    titleEn: 'Gates of Heaven — Pura Lempuyang',
    titleId: 'Gerbang Surga — Pura Lempuyang',
    subtitleEn: 'Iconic mountain split gate framing Mount Agung in crisp morning light',
    subtitleId: 'Gerbang Candi Bentar ikonis dengan latar Gunung Agung di pagi hari',
    imageUrl: '/presets/lempuyang.webp',
    imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    defaultDay: 5, // Saturday (0 = Monday ... 5 = Saturday)
    defaultHour: 9,
    simPeakDay: 5,
    simPeakHour: 9,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'ulun-danu-lake',
    originVenueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f020',
    titleEn: 'Floating Temple — Ulun Danu Beratan',
    titleId: 'Pura Terapung — Ulun Danu Beratan',
    subtitleEn: 'Serene lakeside pagoda surrounded by Bedugul highland mountain mist',
    subtitleId: 'Pura air di tepi Danau Beratan dengan kabut sejuk dataran tinggi Bedugul',
    imageUrl: '/presets/ulundanu.webp',
    imageSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    defaultDay: 6, // Sunday
    defaultHour: 11,
    simPeakDay: 6,
    simPeakHour: 11,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'tegallalang-terrace',
    originVenueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f030',
    titleEn: 'Emerald Steps — Tegallalang Rice Terrace',
    titleId: 'Hamparan Zamrud — Terasering Tegallalang',
    subtitleEn: 'Steep lush valley terraces sculpted with centuries-old Subak craftsmanship',
    subtitleId: 'Lembah terasering sawah hijau bertingkat dengan sistem irigasi Subak',
    imageUrl: '/presets/tegallalang.webp',
    imageSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    defaultDay: 4, // Friday
    defaultHour: 14,
    simPeakDay: 4,
    simPeakHour: 14,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'tanah-lot-sunset',
    originVenueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f040',
    titleEn: 'Ocean Sunset Sanctuary — Tanah Lot',
    titleId: 'Pura Karang Samudra — Tanah Lot',
    subtitleEn: 'Dramatically perched sea temple against the crashing waves of the Indian Ocean',
    subtitleId: 'Pura di atas batu karang laut lepas dengan siluet matahari terbenam',
    imageUrl: '/presets/tanahlot.webp',
    imageSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    defaultDay: 5, // Saturday
    defaultHour: 17,
    simPeakDay: 5,
    simPeakHour: 17,
    sortOrder: 4,
    isActive: true,
  },
];

export const MOCK_PRESETS: readonly CreatePresetInput[] = rawPresets.map((p) =>
  CreatePresetInputSchema.parse(p),
);
