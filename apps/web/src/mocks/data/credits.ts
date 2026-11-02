export interface ImageCredit {
  readonly path: string;
  readonly name: string;
  readonly credit: string;
  readonly license: string;
}

export const IMAGE_CREDITS: readonly ImageCredit[] = [
  {
    path: '/presets/lempuyang.webp',
    name: 'Pura Lempuyang Luhur',
    credit: 'Bali Tourism Board / Wonderful Indonesia',
    license: 'Editorial & Competition use',
  },
  {
    path: '/presets/ulundanu.webp',
    name: 'Pura Ulun Danu Beratan',
    credit: 'Dinas Pariwisata Tabanan',
    license: 'Public Domain / CC0',
  },
  {
    path: '/presets/tegallalang.webp',
    name: 'Tegallalang Rice Terrace',
    credit: 'Gianyar Regency Tourism Office',
    license: 'CC-BY-4.0',
  },
  {
    path: '/presets/tanahlot.webp',
    name: 'Pura Tanah Lot',
    credit: 'Tabanan Regency Tourism Authority',
    license: 'Editorial & Competition use',
  },
  {
    path: '/venues/taman-ujung.webp',
    name: 'Taman Ujung Water Palace',
    credit: 'Dinas Kebudayaan & Pariwisata Karangasem',
    license: 'CC-BY-4.0',
  },
  {
    path: '/venues/lahangan-sweet.webp',
    name: 'Lahangan Sweet Viewpoint',
    credit: 'Komunitas Sadar Wisata Karangasem',
    license: 'CC-BY-SA-4.0',
  },
  {
    path: '/venues/jatiluwih.webp',
    name: 'Jatiluwih Rice Terraces (UNESCO)',
    credit: 'UNESCO World Heritage Centre / Tabanan Regency',
    license: 'Educational use',
  },
  {
    path: '/venues/sambangan.webp',
    name: 'Sambangan Secret Garden & Waterfalls',
    credit: 'Kelompok Sadar Wisata Sambangan Buleleng',
    license: 'CC-BY-4.0',
  },
];
