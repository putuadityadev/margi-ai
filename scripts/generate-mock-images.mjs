/* eslint-disable no-console */
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const images = [
  // Presets
  {
    path: 'apps/web/public/presets/lempuyang.webp',
    title: 'Pura Lempuyang Luhur',
    subtitle: 'Gates of Heaven & Mount Agung',
    colors: ['#0f172a', '#3b82f6', '#f59e0b'],
  },
  {
    path: 'apps/web/public/presets/ulundanu.webp',
    title: 'Ulun Danu Beratan',
    subtitle: 'Floating Lake Temple Bedugul',
    colors: ['#064e3b', '#10b981', '#38bdf8'],
  },
  {
    path: 'apps/web/public/presets/tegallalang.webp',
    title: 'Tegallalang Rice Terrace',
    subtitle: 'Sculpted Valley of Subak Terraces',
    colors: ['#14532d', '#22c55e', '#84cc16'],
  },
  {
    path: 'apps/web/public/presets/tanahlot.webp',
    title: 'Pura Tanah Lot',
    subtitle: 'Sea Temple & Sunset Horizon',
    colors: ['#312e81', '#6366f1', '#f43f5e'],
  },
  {
    path: 'apps/web/public/presets/kelingking.webp',
    title: 'Kelingking Beach',
    subtitle: 'T-Rex Karst Headland & Azure Sea',
    colors: ['#082f49', '#0284c7', '#38bdf8'],
  },

  // DTW Alternatives
  {
    path: 'apps/web/public/venues/lahangan-sweet.webp',
    title: 'Lahangan Sweet',
    subtitle: 'Serene Ridge Overlooking Mount Agung',
    colors: ['#1e1b4b', '#4338ca', '#a855f7'],
  },
  {
    path: 'apps/web/public/venues/taman-ujung.webp',
    title: 'Taman Ujung Water Palace',
    subtitle: 'Royal Reflecting Pools Karangasem',
    colors: ['#134e4a', '#0d9488', '#2dd4bf'],
  },
  {
    path: 'apps/web/public/venues/jatiluwih.webp',
    title: 'Jatiluwih UNESCO Terraces',
    subtitle: 'Expansive Subak Living Landscape',
    colors: ['#14532d', '#16a34a', '#a3e635'],
  },
  {
    path: 'apps/web/public/venues/tamblingan.webp',
    title: 'Lake Tamblingan',
    subtitle: 'Misty Ancient Rainforest Sanctuary',
    colors: ['#1e293b', '#334155', '#64748b'],
  },
  {
    path: 'apps/web/public/venues/banyumala.webp',
    title: 'Banyumala Twin Waterfalls',
    subtitle: 'Twin Cascades & Lush Greenery',
    colors: ['#064e3b', '#059669', '#34d399'],
  },
  {
    path: 'apps/web/public/venues/penglipuran.webp',
    title: 'Desa Adat Penglipuran',
    subtitle: 'Traditional Bamboo Heritage Village',
    colors: ['#78350f', '#b45309', '#f59e0b'],
  },
  {
    path: 'apps/web/public/venues/kehen.webp',
    title: 'Pura Kehen',
    subtitle: 'Ancient Tiered Sanctuary Bangli',
    colors: ['#451a03', '#9a3412', '#ea580c'],
  },
  {
    path: 'apps/web/public/venues/sambangan.webp',
    title: 'Sambangan Secret Garden',
    subtitle: 'Crystal Clear Waterfalls & Canyons',
    colors: ['#0f766e', '#06b6d4', '#67e8f9'],
  },
  {
    path: 'apps/web/public/venues/amed.webp',
    title: 'Pantai Amed',
    subtitle: 'Calm Volcanic Reef Cove',
    colors: ['#0c4a6e', '#0284c7', '#7dd3fc'],
  },

  // MSMEs
  {
    path: 'apps/web/public/venues/warung-bukit-asri.webp',
    title: 'Warung Kopi Bukit Asri',
    subtitle: 'Karangasem Mountain Robusta',
    colors: ['#451a03', '#78350f', '#d97706'],
  },
  {
    path: 'apps/web/public/venues/warung-gurame.webp',
    title: 'Warung Gurame Pesisir',
    subtitle: 'Fresh Coastal Grilled Fish',
    colors: ['#1c1917', '#44403c', '#ea580c'],
  },
  {
    path: 'apps/web/public/venues/kopi-jatiluwih.webp',
    title: 'Kopi Subak Jatiluwih',
    subtitle: 'Artisanal Woodfire Roast',
    colors: ['#365314', '#4d7c0f', '#84cc16'],
  },
  {
    path: 'apps/web/public/venues/warung-men-bayu.webp',
    title: 'Warung Men Bayu',
    subtitle: 'Organic Heritage Red Rice',
    colors: ['#7f1d1d', '#991b1b', '#f87171'],
  },
  {
    path: 'apps/web/public/venues/warung-kelapa.webp',
    title: 'Warung Kelapa Sambangan',
    subtitle: 'Fresh Coconut & River Snacks',
    colors: ['#064e3b', '#047857', '#10b981'],
  },
  {
    path: 'apps/web/public/venues/penglipuran-crafts.webp',
    title: 'Penglipuran Bamboo Crafts',
    subtitle: 'Handwoven Bamboo Artistry',
    colors: ['#78350f', '#92400e', '#f59e0b'],
  },
  {
    path: 'apps/web/public/venues/kopi-men-wi.webp',
    title: 'Kopi Kintamani Men Wi',
    subtitle: 'Highland Citrus Arabica',
    colors: ['#3b0764', '#581c87', '#9333ea'],
  },
  {
    path: 'apps/web/public/venues/warung-amed.webp',
    title: 'Warung Enak Amed',
    subtitle: 'Fishermen Morning Catch',
    colors: ['#082f49', '#0369a1', '#0284c7'],
  },
];

async function generateAll() {
  const width = 1024;
  const height = 768;

  for (const item of images) {
    const fullPath = resolve(process.cwd(), item.path);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const cleanTitle = item.title.replace(/&/g, '&amp;');
    const cleanSubtitle = item.subtitle.replace(/&/g, '&amp;');

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${item.colors[0]}" />
            <stop offset="50%" stop-color="${item.colors[1]}" />
            <stop offset="100%" stop-color="${item.colors[2]}" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <rect width="${width}" height="${height}" fill="url(#glow)" />
        <g text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">
          <text x="${width / 2}" y="${height / 2 - 30}" font-size="44" font-weight="bold" fill="#ffffff" letter-spacing="1">
            ${cleanTitle}
          </text>
          <text x="${width / 2}" y="${height / 2 + 30}" font-size="22" font-weight="500" fill="#f1f5f9" opacity="0.9">
            ${cleanSubtitle}
          </text>
          <text x="${width / 2}" y="${height - 50}" font-size="14" font-weight="600" fill="#cbd5e1" opacity="0.75" letter-spacing="3">
            MARGI AI · BALI HERITAGE DATASET
          </text>
        </g>
      </svg>
    `;

    await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(fullPath);

    console.log(`Generated: ${item.path}`);
  }
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
