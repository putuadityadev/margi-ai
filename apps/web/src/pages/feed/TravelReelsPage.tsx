import { useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import {
  CompassIcon,
  ClockIcon,
  StoreIcon,
  ShareLinkIcon,
  CheckCircleIcon,
} from '../../components/ui';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { track } from '../../lib/track';

interface ReelSpot {
  id: string;
  presetId?: string;
  venueId?: string;
  name: string;
  regency: string;
  category: 'temple' | 'nature' | 'beach';
  image: string;
  bEff: number;
  vibeTag: string;
  quote: string;
  queueWait: string;
  calmAlternative?: string;
}

const REEL_SPOTS: ReelSpot[] = [
  {
    id: 'spot-lempuyang',
    presetId: 'preset-lempuyang',
    name: 'Pura Lempuyang Luhur',
    regency: 'Karangasem',
    category: 'temple',
    image: '/presets/lempuyang.webp',
    bEff: 95,
    vibeTag: 'Candi Megah & Pemandangan Gunung',
    quote: 'Gerbang Candi Bentar berlatar Gunung Agung. Sangat padat saat siang dengan antrean foto berjam-jam.',
    queueWait: '~210 Menit Antre Foto',
    calmAlternative: 'Pura Kehen (Bebas Antre)',
  },
  {
    id: 'spot-kehen',
    venueId: '0192e2b0-dest-7000-8000-000000000001',
    name: 'Pura Kehen',
    regency: 'Bangli',
    category: 'temple',
    image: '/venues/kehen.webp',
    bEff: 22,
    vibeTag: 'Candi Batu Berundak Kuno',
    quote: 'Suasana sakral di bawah pohon beringin raksasa berusia ratusan tahun. Bebas dari kerumunan turis bus.',
    queueWait: '0 Menit (Tanpa Antre)',
  },
  {
    id: 'spot-tegallalang',
    presetId: 'preset-tegallalang',
    name: 'Tegallalang Rice Terrace',
    regency: 'Gianyar / Ubud',
    category: 'nature',
    image: '/presets/tegallalang.webp',
    bEff: 88,
    vibeTag: 'Lembah Terasering Subak',
    quote: 'Undakan sawah hijau yang memukau di Ubud. Ramai saat tengah hari dengan bus wisata.',
    queueWait: '~55 Menit Antre Masuk',
    calmAlternative: 'Jatiluwih (Jauh Lebih Tenang)',
  },
  {
    id: 'spot-jatiluwih',
    name: 'Jatiluwih UNESCO Terraces',
    regency: 'Tabanan',
    category: 'nature',
    image: '/venues/jatiluwih.webp',
    bEff: 26,
    vibeTag: 'Lanskap Subak Terluas di Bali',
    quote: 'Hamparan sawah berundak terluas berlatar Gunung Batukaru. Udara sejuk dan jalur jalan kaki hening.',
    queueWait: 'Bebas Antre (Sangat Tenang)',
  },
  {
    id: 'spot-ulundanu',
    presetId: 'preset-ulundanu',
    name: 'Pura Ulun Danu Beratan',
    regency: 'Bedugul',
    category: 'temple',
    image: '/presets/ulundanu.webp',
    bEff: 82,
    vibeTag: 'Pura Danau Berkabut Sejuk',
    quote: 'Pura air terapung ikonik di tepi danau kaldera. Titik favorit keluarga dan turis mancanegara.',
    queueWait: '~40 Menit Antre Spot',
    calmAlternative: 'Danau Tamblingan (Hening Asri)',
  },
  {
    id: 'spot-tamblingan',
    name: 'Danau Tamblingan',
    regency: 'Buleleng',
    category: 'nature',
    image: '/venues/tamblingan.webp',
    bEff: 18,
    vibeTag: 'Danau Hutan Hujan Purba',
    quote: 'Hening berkabut tanpa perahu motor. Suasana spiritual otentik dengan kano tradisional nelayan lokal.',
    queueWait: 'Tanpa Antre (Hening Total)',
  },
  {
    id: 'spot-kelingking',
    presetId: 'preset-kelingking',
    name: 'Kelingking Beach',
    regency: 'Nusa Penida',
    category: 'beach',
    image: '/presets/kelingking.webp',
    bEff: 96,
    vibeTag: 'Tebing Karst T-Rex & Air Biru',
    quote: 'Formasi tebing paling spektakuler di Asia Tenggara. Jalur tebing sangat sempit dan padat antre foto.',
    queueWait: '~90 Menit di Jalur Tangga',
  },
  {
    id: 'spot-taman-ujung',
    name: 'Taman Ujung Water Palace',
    regency: 'Karangasem',
    category: 'temple',
    image: '/venues/taman-ujung.webp',
    bEff: 20,
    vibeTag: 'Istana Air Karangasem & Gunung Agung',
    quote: 'Perpaduan arsitektur tradisional Bali dan Eropa berlatar Gunung Agung dan kolam teratai tenang.',
    queueWait: '0 Menit Antre (Sangat Lapang)',
  },
  {
    id: 'spot-tanahlot',
    presetId: 'preset-tanahlot',
    name: 'Pura Tanah Lot',
    regency: 'Tabanan',
    category: 'temple',
    image: '/presets/tanahlot.webp',
    bEff: 92,
    vibeTag: 'Pura Karang Samudra & Matahari Terbenam',
    quote: 'Siluet pura di atas batu karang ombak samudra. Selalu dipadati ribuan pemburu sunset setiap sore.',
    queueWait: '~60 Menit Antre Parkir & Masuk',
    calmAlternative: 'Pantai Amed (Senja Gunung Agung)',
  },
  {
    id: 'spot-banyumala',
    name: 'Banyumala Twin Waterfalls',
    regency: 'Buleleng',
    category: 'nature',
    image: '/venues/banyumala.webp',
    bEff: 30,
    vibeTag: 'Air Terjun Kembar Lembah Hutan',
    quote: 'Tirai air alami jernih di tengah rimbun lembah tropis. Sangat segar untuk berenang santai.',
    queueWait: 'Jalur Bebas & Santai',
  },
];

type FilterTab = 'all' | 'calm' | 'popular' | 'temple' | 'nature';

export function TravelReelsPage(): ReactNode {
  const { i18n } = useTranslation();
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setPreset = useAnalyzerStore((s) => s.setPreset);

  const filteredSpots = REEL_SPOTS.filter((s) => {
    if (activeFilter === 'calm') return s.bEff <= 35;
    if (activeFilter === 'popular') return s.bEff > 70;
    if (activeFilter === 'temple') return s.category === 'temple';
    if (activeFilter === 'nature') return s.category === 'nature' || s.category === 'beach';
    return true;
  });

  const handleLaunchAnalysis = (spot: ReelSpot): void => {
    track('reels_launch_analysis_clicked', { spotId: spot.id, name: spot.name });

    if (spot.presetId) {
      const match = MOCK_PRESETS.find((p) => p.id === spot.presetId);
      if (match) {
        setPreset(match);
        void navigate(`/app?preset=${match.id}&run=1`);
        return;
      }
    }

    // Default to app with first preset
    const fallback = MOCK_PRESETS[0];
    if (fallback) {
      setPreset(fallback);
      void navigate(`/app?preset=${fallback.id}&run=1`);
    } else {
      void navigate('/app');
    }
  };

  const handleShare = async (spot: ReelSpot): Promise<void> => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/feed` : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${spot.name} — MARGI AI Bali Guide: ${shareUrl}`);
        setCopiedId(spot.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Ignore clipboard error
      }
    }
  };

  const scrollToNext = (index: number): void => {
    if (containerRef.current) {
      const nextIndex = (index + 1) % filteredSpots.length;
      const child = containerRef.current.children[nextIndex] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white select-none overflow-hidden">
      {/* Floating Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void navigate(-1)}
              className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-none cursor-pointer transition"
            >
              ← {isId ? 'Kembali' : 'Back'}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-lime text-ink border border-ink text-[11px] font-medium tracking-wider uppercase">
              <CompassIcon size={12} />
              <span>MARGI REELS</span>
            </div>
          </div>

          <span className="text-[11px] text-white/70">
            {isId ? 'Geser vertikal untuk jelajah' : 'Swipe down to explore'}
          </span>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all' as FilterTab, label: isId ? 'Semua' : 'All Spots' },
            { id: 'calm' as FilterTab, label: isId ? 'Paling Tenang (Bebas Antre)' : 'Calm First' },
            { id: 'popular' as FilterTab, label: isId ? 'Terpopuler (Ramai)' : 'Popular' },
            { id: 'temple' as FilterTab, label: isId ? 'Pura & Budaya' : 'Temples' },
            { id: 'nature' as FilterTab, label: isId ? 'Alam & Pantai' : 'Nature & Beach' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`text-[11px] font-medium px-2.5 py-1 whitespace-nowrap border transition cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-white text-ink border-white'
                  : 'bg-black/40 text-white/80 border-white/20 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Snap Scrollable Reels Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain no-scrollbar"
      >
        {filteredSpots.map((spot, idx) => (
          <section
            key={spot.id}
            className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden flex flex-col justify-end p-4 sm:p-6 pb-20 sm:pb-16"
          >
            {/* Background Full-Bleed Photograph */}
            <img
              src={spot.image}
              alt={spot.name}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />

            {/* Dark Vignette Overlay for Text Legibility (No Murky Tint) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

            {/* Right Side Floating Social/Status Pills */}
            <div className="absolute right-3 sm:right-5 bottom-36 sm:bottom-28 z-20 flex flex-col items-center gap-3">
              {/* Busyness Badge */}
              <div
                className={`p-2 border text-center rounded-none backdrop-blur-md ${
                  spot.bEff > 70
                    ? 'bg-charcoal/90 text-white border-white/50'
                    : 'bg-lime/90 text-ink border-ink'
                }`}
              >
                <span className="block text-[10px] uppercase font-medium">STATUS</span>
                <strong className="block text-xs font-medium tabular-nums">
                  {spot.bEff}%
                </strong>
                <span className="block text-[9px]">
                  {spot.bEff > 70 ? (isId ? 'Padat' : 'Peak') : isId ? 'Tenang' : 'Calm'}
                </span>
              </div>

              {/* Share Button */}
              <button
                type="button"
                onClick={() => handleShare(spot)}
                aria-label="Bagikan destinasi ini"
                className="w-10 h-10 rounded-none bg-black/60 hover:bg-black/80 border border-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <ShareLinkIcon size={16} />
              </button>
              {copiedId === spot.id && (
                <span className="absolute -top-7 right-0 text-[10px] bg-white text-ink px-1.5 py-0.5 border border-ink whitespace-nowrap">
                  Tersalin!
                </span>
              )}

              {/* Next Slide Arrow Hint */}
              {idx < filteredSpots.length - 1 && (
                <button
                  type="button"
                  onClick={() => scrollToNext(idx)}
                  aria-label="Gulir ke destinasi berikutnya"
                  className="w-8 h-8 rounded-none bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition cursor-pointer mt-2"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bottom Content Card (Swiss Typography) */}
            <div className="relative z-20 space-y-3 max-w-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-black/70 border border-white/40 text-[10px] uppercase tracking-wider text-lime font-medium">
                    {spot.regency}
                  </span>
                  <span className="px-2 py-0.5 bg-black/70 border border-white/40 text-[10px] text-white/90">
                    {spot.vibeTag}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-medium text-white leading-tight">
                  {spot.name}
                </h1>
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                  {spot.quote}
                </p>
              </div>

              {/* Live Waiting Time Fact Banner */}
              <div className="p-2.5 bg-black/70 border border-white/30 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <ClockIcon size={14} className="text-lime" />
                  <span className="text-white/90 font-medium">{spot.queueWait}</span>
                </div>

                {spot.calmAlternative ? (
                  <span className="text-[11px] text-lime">
                    {isId ? 'Rekomendasi:' : 'Calmer:'} {spot.calmAlternative}
                  </span>
                ) : (
                  <span className="text-[11px] text-lime font-medium">
                    {isId ? '✓ Rute Terbuka' : '✓ Serene Spot'}
                  </span>
                )}
              </div>

              {/* Primary Call to Action Button */}
              <button
                type="button"
                onClick={() => handleLaunchAnalysis(spot)}
                className="w-full py-3 px-4 bg-lime hover:brightness-105 active:scale-[0.99] border-2 border-ink text-ink font-medium text-xs sm:text-sm transition flex items-center justify-between cursor-pointer"
              >
                <span>
                  {isId
                    ? `✦ Cek Keramaian & Alternatif ${spot.name}`
                    : `✦ Check Crowding & Reroute for ${spot.name}`}
                </span>
                <span className="text-base font-medium">→</span>
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default TravelReelsPage;
