import {
  VenueLiteSchema,
  type OpeningHours,
  type VenueCategory,
  type VenueKind,
  type VenueLite,
} from '@margi-ai/shared';

export interface MockVenueDetail extends VenueLite {
  readonly openingHours: OpeningHours;
  readonly typicalPeakQueueMinutes: number;
  readonly avgDwellMinutes: number;
  readonly etiquetteTags: string[];
}

const standardHours: OpeningHours = {
  '0': [['08:00', '18:00']],
  '1': [['08:00', '18:00']],
  '2': [['08:00', '18:00']],
  '3': [['08:00', '18:00']],
  '4': [['08:00', '18:00']],
  '5': [['08:00', '18:00']],
  '6': [['08:00', '18:00']],
};

function createVenue(data: {
  id: string;
  slug: string;
  kind: VenueKind;
  category: VenueCategory;
  nameEn: string;
  nameId: string;
  descriptionEn: string;
  descriptionId: string;
  regencyId: string;
  lat: number;
  lng: number;
  imageUrl: string;
  imageCredit?: string;
  priceLevel?: number;
  isHotspot?: boolean;
  isBufferZone?: boolean;
  openingHours?: OpeningHours;
  typicalPeakQueueMinutes?: number;
  avgDwellMinutes?: number;
  etiquetteTags?: string[];
}): MockVenueDetail {
  const lite = VenueLiteSchema.parse({
    id: data.id,
    slug: data.slug,
    kind: data.kind,
    category: data.category,
    nameEn: data.nameEn,
    nameId: data.nameId,
    descriptionEn: data.descriptionEn,
    descriptionId: data.descriptionId,
    regencyId: data.regencyId,
    lat: data.lat,
    lng: data.lng,
    imageUrl: data.imageUrl,
    imageCredit: data.imageCredit ?? null,
    priceLevel: data.priceLevel ?? 1,
    isHotspot: data.isHotspot ?? false,
    isBufferZone: data.isBufferZone ?? false,
  });

  return {
    ...lite,
    openingHours: data.openingHours ?? standardHours,
    typicalPeakQueueMinutes: data.typicalPeakQueueMinutes ?? 0,
    avgDwellMinutes: data.avgDwellMinutes ?? 60,
    etiquetteTags: data.etiquetteTags ?? [],
  };
}

export const MOCK_VENUES: readonly MockVenueDetail[] = [
  // ── 5 Hotspot Origins ──
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f010',
    slug: 'pura-lempuyang',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Penataran Agung Lempuyang',
    nameId: 'Pura Penataran Agung Lempuyang',
    descriptionEn: 'Mountain sanctuary famed for Candhi Bentar split gate overlooking Mount Agung.',
    descriptionId:
      'Pura di lereng Gunung Lempuyang dengan gerbang Candi Bentar berlatar Gunung Agung.',
    regencyId: 'karangasem',
    lat: -8.3917,
    lng: 115.6314,
    imageUrl: '/presets/lempuyang.webp',
    imageCredit: 'Bali Tourism Board',
    priceLevel: 2,
    isHotspot: true,
    typicalPeakQueueMinutes: 210,
    avgDwellMinutes: 120,
    etiquetteTags: ['temple-sarong', 'holy-water-respect', 'sacred-steps'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f020',
    slug: 'ulun-danu-beratan',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Ulun Danu Beratan',
    nameId: 'Pura Ulun Danu Beratan',
    descriptionEn:
      'Iconic water temple perched on Lake Beratan in the central highlands of Bedugul.',
    descriptionId: 'Pura terapung di tepi Danau Beratan Bedugul berhawa sejuk dataran tinggi.',
    regencyId: 'tabanan',
    lat: -8.2752,
    lng: 115.1664,
    imageUrl: '/presets/ulundanu.webp',
    imageCredit: 'Dinas Pariwisata Tabanan',
    priceLevel: 2,
    isHotspot: true,
    typicalPeakQueueMinutes: 90,
    avgDwellMinutes: 90,
    etiquetteTags: ['temple-sarong', 'sacred-lake'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f030',
    slug: 'tegallalang',
    kind: 'DTW',
    category: 'RICE_TERRACE',
    nameEn: 'Tegallalang Rice Terrace',
    nameId: 'Terasering Tegallalang',
    descriptionEn: 'Famous sculpted terraced hillside utilizing ancient Subak irrigation system.',
    descriptionId: 'Lanskap terasering sawah khas Subak Bali dengan deretan kafe tepi jurang.',
    regencyId: 'gianyar',
    lat: -8.435,
    lng: 115.2789,
    imageUrl: '/presets/tegallalang.webp',
    imageCredit: 'Gianyar Regency Tourism Office',
    priceLevel: 1,
    isHotspot: true,
    typicalPeakQueueMinutes: 60,
    avgDwellMinutes: 75,
    etiquetteTags: ['subak-respect', 'trail-safety'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f040',
    slug: 'tanah-lot',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Tanah Lot',
    nameId: 'Pura Tanah Lot',
    descriptionEn: 'Ancient sea temple situated on a rocky islet facing dramatic ocean sunsets.',
    descriptionId:
      'Pura di atas bongkahan batu karang pesisir yang terkenal dengan matahari terbenam.',
    regencyId: 'tabanan',
    lat: -8.6212,
    lng: 115.0868,
    imageUrl: '/presets/tanahlot.webp',
    imageCredit: 'Tabanan Regency Tourism Authority',
    priceLevel: 2,
    isHotspot: true,
    typicalPeakQueueMinutes: 120,
    avgDwellMinutes: 90,
    etiquetteTags: ['temple-sarong', 'tide-safety', 'holy-snake-respect'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f050',
    slug: 'kelingking-beach',
    kind: 'DTW',
    category: 'BEACH',
    nameEn: 'Kelingking Beach T-Rex',
    nameId: 'Pantai Kelingking',
    descriptionEn: 'Dramatic T-Rex shaped limestone coastal headland dropping into azure seas.',
    descriptionId:
      'Tebing karst berbentuk kepala dinosaurus menjulang di atas pantai berpasir putih.',
    regencyId: 'klungkung',
    lat: -8.7513,
    lng: 115.4744,
    imageUrl: '/presets/kelingking.webp',
    imageCredit: 'Klungkung Regency',
    priceLevel: 1,
    isHotspot: true,
    typicalPeakQueueMinutes: 150,
    avgDwellMinutes: 120,
    etiquetteTags: ['cliff-safety', 'steep-descent-warning'],
  }),

  // ── DTW Alternatives ──
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f011',
    slug: 'lahangan-sweet',
    kind: 'DTW',
    category: 'VIEWPOINT',
    nameEn: 'Lahangan Sweet Viewpoint',
    nameId: 'Lahangan Sweet',
    descriptionEn:
      'Serene mountain ridge platform framing Mount Agung with unobstructed eastern vistas.',
    descriptionId: 'Punggung bukit tenang dengan gardu pandang kayu menghadap Gunung Agung.',
    regencyId: 'karangasem',
    lat: -8.3842,
    lng: 115.6231,
    imageUrl: '/venues/lahangan-sweet.webp',
    priceLevel: 1,
    isBufferZone: true,
    typicalPeakQueueMinutes: 15,
    avgDwellMinutes: 60,
    etiquetteTags: ['cliff-safety'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f012',
    slug: 'taman-ujung',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Taman Ujung Water Palace',
    nameId: 'Taman Soekasada Ujung',
    descriptionEn:
      'Royal water palace with expansive reflective ponds, stone bridges, and ocean views.',
    descriptionId:
      'Istana air peninggalan Raja Karangasem dengan kolam refleksi megah di tepi laut.',
    regencyId: 'karangasem',
    lat: -8.4633,
    lng: 115.6308,
    imageUrl: '/venues/taman-ujung.webp',
    priceLevel: 2,
    typicalPeakQueueMinutes: 10,
    avgDwellMinutes: 90,
    etiquetteTags: ['temple-sarong'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f021',
    slug: 'jatiluwih',
    kind: 'DTW',
    category: 'RICE_TERRACE',
    nameEn: 'Jatiluwih Rice Terraces (UNESCO)',
    nameId: 'Terasering Jatiluwih (UNESCO)',
    descriptionEn:
      'Over 600 hectares of sprawling UNESCO heritage rice fields at the foot of Mount Batukaru.',
    descriptionId:
      'Hamparan sawah berundak terluas di Bali yang diakui UNESCO sebagai Warisan Budaya Dunia.',
    regencyId: 'tabanan',
    lat: -8.3705,
    lng: 115.1308,
    imageUrl: '/venues/jatiluwih.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 15,
    avgDwellMinutes: 120,
    etiquetteTags: ['subak-respect', 'nature-footpath'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f022',
    slug: 'danau-tamblingan',
    kind: 'DTW',
    category: 'LAKE',
    nameEn: 'Lake Tamblingan Sanctuary',
    nameId: 'Danau Tamblingan',
    descriptionEn:
      'Misty volcanic caldera lake surrounded by ancient rainforest and quiet lakeside shrines.',
    descriptionId:
      'Danau kaldera berkabut di tengah hutan hujan purba dengan suasana spiritual yang hening.',
    regencyId: 'buleleng',
    lat: -8.2575,
    lng: 115.0931,
    imageUrl: '/venues/tamblingan.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 90,
    etiquetteTags: ['sacred-lake', 'leave-no-trace'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f031',
    slug: 'banyumala-twin-waterfalls',
    kind: 'DTW',
    category: 'WATERFALL',
    nameEn: 'Banyumala Twin Waterfalls',
    nameId: 'Air Terjun Kembar Banyumala',
    descriptionEn:
      'Pristine twin cascading streams cascading down lush moss-covered volcanic rock.',
    descriptionId:
      'Dua aliran air terjun jernih membelah tebing berlumut hijau di lembah tersembunyi.',
    regencyId: 'buleleng',
    lat: -8.2173,
    lng: 115.1189,
    imageUrl: '/venues/banyumala.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 20,
    avgDwellMinutes: 75,
    etiquetteTags: ['swim-safety', 'trail-caution'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f032',
    slug: 'desa-penglipuran',
    kind: 'DTW',
    category: 'VILLAGE',
    nameEn: 'Penglipuran Traditional Village',
    nameId: 'Desa Wisata Penglipuran',
    descriptionEn:
      'Celebrated traditional village renowned for pristine bamboo architecture and spatial harmony.',
    descriptionId:
      'Desa adat terbersih dengan arsitektur bambu seragam berpedoman Tri Hita Karana.',
    regencyId: 'bangli',
    lat: -8.4522,
    lng: 115.3564,
    imageUrl: '/venues/penglipuran.webp',
    priceLevel: 2,
    typicalPeakQueueMinutes: 30,
    avgDwellMinutes: 90,
    etiquetteTags: ['village-etiquette', 'courtyard-respect'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f033',
    slug: 'pura-kehen',
    kind: 'DTW',
    category: 'TEMPLE',
    nameEn: 'Pura Kehen Sanctuary',
    nameId: 'Pura Kehen',
    descriptionEn:
      'Majestic 11th-century temple terraced into a forested slope with an ancient banyan tree.',
    descriptionId:
      'Pura kuno bertingkat abad ke-11 dengan pohon beringin raksasa di halaman utama.',
    regencyId: 'bangli',
    lat: -8.4453,
    lng: 115.3625,
    imageUrl: '/venues/kehen.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 10,
    avgDwellMinutes: 60,
    etiquetteTags: ['temple-sarong'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f034',
    slug: 'sambangan-secret-garden',
    kind: 'DTW',
    category: 'NATURE',
    nameEn: 'Sambangan Secret Garden',
    nameId: 'Taman Rahasia Sambangan',
    descriptionEn:
      'Lush natural canyon featuring seven hidden waterfalls, natural rock slides, and pools.',
    descriptionId:
      'Lembah ngarai alami dengan tujuh air terjun tersembunyi dan kolam renang alami.',
    regencyId: 'buleleng',
    lat: -8.1756,
    lng: 115.1053,
    imageUrl: '/venues/sambangan.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 15,
    avgDwellMinutes: 120,
    etiquetteTags: ['swim-safety', 'local-guide-recommended'],
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f035',
    slug: 'pantai-amed',
    kind: 'DTW',
    category: 'BEACH',
    nameEn: 'Amed Black Sand Bay',
    nameId: 'Pantai Amed',
    descriptionEn:
      'Calm volcanic black-sand cove with vibrant near-shore coral gardens and Mount Agung views.',
    descriptionId:
      'Teluk pasir hitam vulkanik dengan terumbu karang dangkal berlatar Gunung Agung.',
    regencyId: 'karangasem',
    lat: -8.3444,
    lng: 115.6536,
    imageUrl: '/venues/amed.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 10,
    avgDwellMinutes: 90,
    etiquetteTags: ['reef-protection', 'traditional-jukung-respect'],
  }),

  // ── MSMEs ──
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f081',
    slug: 'warung-bukit-asri',
    kind: 'MSME',
    category: 'COFFEE',
    nameEn: 'Warung Kopi Bukit Asri',
    nameId: 'Warung Kopi Bukit Asri',
    descriptionEn:
      'Family-run mountain coffee stall serving Karangasem robusta and crispy Balinese cassava.',
    descriptionId:
      'Kedai kopi keluarga menyajikan robusta lokal lereng gunung dan singkong goreng gurih.',
    regencyId: 'karangasem',
    lat: -8.386,
    lng: 115.624,
    imageUrl: '/venues/warung-bukit-asri.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 40,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f082',
    slug: 'warung-gurame-pesisir',
    kind: 'MSME',
    category: 'CULINARY',
    nameEn: 'Warung Gurame Pesisir',
    nameId: 'Warung Gurame Pesisir',
    descriptionEn:
      'Coastal garden warung serving fresh grilled fish and traditional plecing kangkung.',
    descriptionId:
      'Warung tepi pantai menyajikan olahan ikan gurame bakar bumbu rempah dan plecing kangkung.',
    regencyId: 'karangasem',
    lat: -8.466,
    lng: 115.632,
    imageUrl: '/venues/warung-gurame.webp',
    priceLevel: 2,
    typicalPeakQueueMinutes: 15,
    avgDwellMinutes: 50,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f083',
    slug: 'kopi-jatiluwih',
    kind: 'MSME',
    category: 'COFFEE',
    nameEn: 'Kopi Luwak & Robusta Subak',
    nameId: 'Kopi Subak Jatiluwih',
    descriptionEn:
      'Organic coffee roasted over woodfire by farmers of the Jatiluwih Subak cooperative.',
    descriptionId: 'Kopi organik sangrai kayu bakar binaan koperasi petani Subak Jatiluwih.',
    regencyId: 'tabanan',
    lat: -8.3712,
    lng: 115.1315,
    imageUrl: '/venues/kopi-jatiluwih.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 35,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f084',
    slug: 'warung-men-bayu',
    kind: 'MSME',
    category: 'CULINARY',
    nameEn: 'Warung Men Bayu Tabanan',
    nameId: 'Warung Men Bayu',
    descriptionEn:
      'Traditional red rice nasi campur made from native heirloom rice harvested on site.',
    descriptionId: 'Nasi campur beras merah organik asli Jatiluwih dengan lauk ayam betutu empuk.',
    regencyId: 'tabanan',
    lat: -8.3725,
    lng: 115.133,
    imageUrl: '/venues/warung-men-bayu.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 10,
    avgDwellMinutes: 45,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f085',
    slug: 'warung-kelapa-sambangan',
    kind: 'MSME',
    category: 'CULINARY',
    nameEn: 'Warung Kelapa Muda Sambangan',
    nameId: 'Warung Kelapa Sambangan',
    descriptionEn:
      'Fresh young coconut refreshments and home-style Balinese sate lilit by the river path.',
    descriptionId:
      'Kelapa muda segar dan sate lilit ikan khas Buleleng di tepi jalur setapak sungai.',
    regencyId: 'buleleng',
    lat: -8.1748,
    lng: 115.1045,
    imageUrl: '/venues/warung-kelapa.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 30,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f086',
    slug: 'penglipuran-crafts',
    kind: 'MSME',
    category: 'CRAFT',
    nameEn: 'Penglipuran Bamboo Artisan Studio',
    nameId: 'Kerajinan Bambu Adat Penglipuran',
    descriptionEn:
      'Woven bamboo home goods handcrafted by village elders preserving native forest species.',
    descriptionId: 'Kerajinan anyaman bambu khas warga adat yang memanfaatkan hutan bambu lestari.',
    regencyId: 'bangli',
    lat: -8.4518,
    lng: 115.357,
    imageUrl: '/venues/penglipuran-crafts.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 30,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f087',
    slug: 'kopi-men-wi',
    kind: 'MSME',
    category: 'COFFEE',
    nameEn: 'Kopi Arabika Kintamani Men Wi',
    nameId: 'Kopi Kintamani Men Wi',
    descriptionEn: 'Single-origin citrusy Kintamani highland arabica served on a bamboo veranda.',
    descriptionId:
      'Kopi arabika dataran tinggi Kintamani dengan aroma jeruk khas di beranda bambu.',
    regencyId: 'bangli',
    lat: -8.4448,
    lng: 115.3618,
    imageUrl: '/venues/kopi-men-wi.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 5,
    avgDwellMinutes: 35,
  }),
  createVenue({
    id: '0192e2b0-8c20-7193-8db6-8d5ec4f0f088',
    slug: 'warung-enak-amed',
    kind: 'MSME',
    category: 'CULINARY',
    nameEn: 'Warung Enak Amed Fishermen',
    nameId: 'Warung Enak Nelayan Amed',
    descriptionEn: 'Fresh morning catch grilled over coconut husks right off the fishing canoes.',
    descriptionId:
      'Ikan segar hasil tangkapan pagi bakar sabut kelapa dari perahu jukung tradisional.',
    regencyId: 'karangasem',
    lat: -8.345,
    lng: 115.654,
    imageUrl: '/venues/warung-amed.webp',
    priceLevel: 1,
    typicalPeakQueueMinutes: 10,
    avgDwellMinutes: 45,
  }),
];
