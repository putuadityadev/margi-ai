import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const realPhotos = [
  // Presets
  {
    path: 'apps/web/public/presets/lempuyang.webp',
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1024&q=80',
    name: 'Pura Lempuyang',
  },
  {
    path: 'apps/web/public/presets/ulundanu.webp',
    url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1024&q=80',
    name: 'Ulun Danu Beratan',
  },
  {
    path: 'apps/web/public/presets/tegallalang.webp',
    url: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=1024&q=80',
    name: 'Tegallalang Rice Terrace',
  },
  {
    path: 'apps/web/public/presets/tanahlot.webp',
    url: 'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1024&q=80',
    name: 'Pura Tanah Lot',
  },
  {
    path: 'apps/web/public/presets/kelingking.webp',
    url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1024&q=80',
    name: 'Kelingking Beach',
  },

  // Venues (DTW Alternatives)
  {
    path: 'apps/web/public/venues/lahangan-sweet.webp',
    url: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=1024&q=80',
    name: 'Lahangan Sweet',
  },
  {
    path: 'apps/web/public/venues/taman-ujung.webp',
    url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1024&q=80',
    name: 'Taman Ujung',
  },
  {
    path: 'apps/web/public/venues/jatiluwih.webp',
    url: 'https://images.unsplash.com/photo-1531737212413-667205e1cda7?auto=format&fit=crop&w=1024&q=80',
    name: 'Jatiluwih',
  },
  {
    path: 'apps/web/public/venues/tamblingan.webp',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1024&q=80',
    name: 'Danau Tamblingan',
  },
  {
    path: 'apps/web/public/venues/banyumala.webp',
    url: 'https://images.unsplash.com/photo-1546484475-7f7bd55792da?auto=format&fit=crop&w=1024&q=80',
    name: 'Banyumala Twin Waterfalls',
  },
  {
    path: 'apps/web/public/venues/penglipuran.webp',
    url: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1024&q=80',
    name: 'Desa Penglipuran',
  },
  {
    path: 'apps/web/public/venues/kehen.webp',
    url: 'https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=1024&q=80',
    name: 'Pura Kehen',
  },
  {
    path: 'apps/web/public/venues/sambangan.webp',
    url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1024&q=80',
    name: 'Air Terjun Sambangan',
  },
  {
    path: 'apps/web/public/venues/amed.webp',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1024&q=80',
    name: 'Pantai Amed',
  },

  // MSMEs
  {
    path: 'apps/web/public/venues/warung-bukit-asri.webp',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    name: 'Warung Bukit Asri',
  },
  {
    path: 'apps/web/public/venues/warung-gurame.webp',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    name: 'Warung Gurame Pesisir',
  },
  {
    path: 'apps/web/public/venues/kopi-jatiluwih.webp',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    name: 'Kopi Jatiluwih',
  },
  {
    path: 'apps/web/public/venues/warung-men-bayu.webp',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    name: 'Warung Men Bayu',
  },
  {
    path: 'apps/web/public/venues/warung-kelapa.webp',
    url: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=800&q=80',
    name: 'Warung Kelapa',
  },
  {
    path: 'apps/web/public/venues/penglipuran-crafts.webp',
    url: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=800&q=80',
    name: 'Penglipuran Bamboo Crafts',
  },
  {
    path: 'apps/web/public/venues/kopi-men-wi.webp',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    name: 'Kopi Men Wi',
  },
  {
    path: 'apps/web/public/venues/warung-amed.webp',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    name: 'Warung Enak Amed',
  },
];

async function downloadAll() {
  console.log(`Starting real photo replacement for ${realPhotos.length} venues...`);

  for (const item of realPhotos) {
    const fullPath = resolve(process.cwd(), item.path);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      const res = await fetch(item.url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${item.url}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await sharp(buffer)
        .resize({ width: 1024, height: 768, fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(fullPath);
      console.log(`✓ Updated real photo: ${item.name} -> ${item.path}`);
    } catch (err) {
      console.error(`✗ Failed to download ${item.name}:`, err.message);
    }
  }

  console.log('All real photos downloaded and converted to webp successfully!');
}

downloadAll();
