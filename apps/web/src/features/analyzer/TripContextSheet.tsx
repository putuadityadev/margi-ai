import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAnalyzerStore,
  type DepartureArea,
  type TravelMode,
} from '../../stores/analyzerStore';
import { MOCK_VENUES } from '../../mocks/data/venues';
import {
  MapPinIcon,
  ClockIcon,
  MotorcycleIcon,
  CarIcon,
  Switch,
  Card,
  Pill,
} from '../../components/ui';

export const DEPARTURE_AREAS: readonly DepartureArea[] = [
  {
    id: 'gps',
    nameId: 'Lokasi Saya (GPS)',
    nameEn: 'My Location (GPS)',
    lat: -8.65,
    lng: 115.1333,
  },
  {
    id: 'seminyak',
    nameId: 'Seminyak / Canggu',
    nameEn: 'Seminyak / Canggu',
    lat: -8.6913,
    lng: 115.1682,
  },
  {
    id: 'ubud',
    nameId: 'Ubud Pusat',
    nameEn: 'Central Ubud',
    lat: -8.5069,
    lng: 115.2625,
  },
  {
    id: 'sanur',
    nameId: 'Sanur / Denpasar',
    nameEn: 'Sanur / Denpasar',
    lat: -8.6882,
    lng: 115.2633,
  },
  {
    id: 'kuta',
    nameId: 'Kuta / Nusa Dua',
    nameEn: 'Kuta / Nusa Dua',
    lat: -8.7231,
    lng: 115.1723,
  },
];

interface ArrivalTimePreset {
  readonly labelId: string;
  readonly labelEn: string;
  readonly hour: number;
  readonly isNow?: boolean;
}

export interface TripContextSheetProps {
  readonly onStartScan: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly className?: string | undefined;
}

export function TripContextSheet({
  onStartScan,
  onBack,
  className = '',
}: TripContextSheetProps): ReactNode {
  const { i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');

  const departureArea = useAnalyzerStore((s) => s.departureArea);
  const setDepartureArea = useAnalyzerStore((s) => s.setDepartureArea);
  const travelMode = useAnalyzerStore((s) => s.travelMode);
  const setTravelMode = useAnalyzerStore((s) => s.setTravelMode);
  const arrival = useAnalyzerStore((s) => s.arrival);
  const setArrival = useAnalyzerStore((s) => s.setArrival);
  const simulate = useAnalyzerStore((s) => s.simulate);
  const setSimulate = useAnalyzerStore((s) => s.setSimulate);
  const destinationVenueId = useAnalyzerStore((s) => s.destinationVenueId);
  const previewUrl = useAnalyzerStore((s) => s.previewUrl);

  // Default departure area to GPS or Seminyak on first open if empty
  useEffect(() => {
    if (!departureArea) {
      setDepartureArea(DEPARTURE_AREAS[0] ?? null);
    }
  }, [departureArea, setDepartureArea]);

  const activeVenue = MOCK_VENUES.find((v) => v.id === destinationVenueId);

  const timePresets: readonly ArrivalTimePreset[] = [
    { labelId: 'Sekarang', labelEn: 'Now', hour: arrival.hour, isNow: true },
    { labelId: 'Pagi (08:00)', labelEn: 'Morning (08:00)', hour: 8 },
    { labelId: 'Siang (12:00)', labelEn: 'Noon (12:00)', hour: 12 },
    { labelId: 'Sore (16:00)', labelEn: 'Late (16:00)', hour: 16 },
  ];

  const handleSelectDeparture = (area: DepartureArea): void => {
    setDepartureArea(area);
  };

  const handleSelectTime = (preset: ArrivalTimePreset): void => {
    setArrival({
      hour: preset.hour,
      isManual: !preset.isNow,
    });
  };

  const handleSelectMode = (mode: TravelMode): void => {
    setTravelMode(mode);
  };

  return (
    <Card className={`p-5 sm:p-6 space-y-6 bg-parchment-card ${className}`}>
      {/* Header & Target Destination */}
      <div className="flex items-start justify-between gap-4 border-b border-ash/40 pb-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-graphite block">
            {isId ? 'Langkah 2 dari 2: Konfirmasi Perjalanan' : 'Step 2 of 2: Trip Confirmation'}
          </span>
          <h3 className="text-lg font-medium text-ink mt-0.5">
            {isId ? 'Lengkapi Rincian Perjalanan' : 'Confirm Your Trip Context'}
          </h3>
          <p className="text-xs text-graphite mt-0.5">
            {isId
              ? 'AI MARGI akan menghitung kepadatan koridor jalan, antrean gerbang, dan UMKM sejalur.'
              : 'MARGI AI will analyze corridor traffic, gate queues, and along-the-way MSMEs.'}
          </p>
        </div>
        {activeVenue && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-parchment border border-ash/60 shrink-0">
            {previewUrl || activeVenue.imageUrl ? (
              <img
                src={previewUrl || activeVenue.imageUrl}
                alt=""
                className="w-7 h-7 object-cover"
              />
            ) : null}
            <div className="text-left">
              <span className="block text-[10px] text-graphite uppercase">
                {isId ? 'Destinasi Tujuan' : 'Target Destination'}
              </span>
              <span className="block text-xs font-medium text-ink max-w-[130px] truncate">
                {isId ? activeVenue.nameId : activeVenue.nameEn}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Titik Berangkat (Departure Location) */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-graphite uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <MapPinIcon size={14} />
            {isId ? 'Berangkat Dari' : 'Departing From'}
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEPARTURE_AREAS.map((area) => {
            const isSelected = departureArea?.id === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => handleSelectDeparture(area)}
                className={`px-3 py-2 text-left text-xs transition-colors border ${
                  isSelected
                    ? 'border-ink bg-ink text-parchment font-medium'
                    : 'border-ash/60 bg-parchment hover:bg-parchment-border text-ink font-normal'
                }`}
              >
                {isId ? area.nameId : area.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Estimasi Waktu Tiba (Arrival Time Chips) */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-graphite uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <ClockIcon size={14} />
            {isId ? 'Estimasi Tiba di Destinasi' : 'Estimated Arrival Time'}
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {timePresets.map((preset) => {
            const isSelected = arrival.hour === preset.hour;
            return (
              <button
                key={preset.labelEn}
                type="button"
                onClick={() => handleSelectTime(preset)}
                className={`px-3 py-2 text-center text-xs transition-colors border ${
                  isSelected
                    ? 'border-ink bg-ink text-parchment font-medium'
                    : 'border-ash/60 bg-parchment hover:bg-parchment-border text-ink font-normal'
                }`}
              >
                {isId ? preset.labelId : preset.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Moda Transportasi & Simulasi Peak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ash/40">
        {/* Moda Transportasi */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-graphite uppercase tracking-wider">
            {isId ? 'Moda Transportasi' : 'Travel Mode'}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectMode('MOTORCYCLE')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs border transition-colors ${
                travelMode === 'MOTORCYCLE'
                  ? 'border-ink bg-ink text-parchment font-medium'
                  : 'border-ash/60 bg-parchment hover:bg-parchment-border text-ink'
              }`}
            >
              <MotorcycleIcon size={16} />
              <span>{isId ? 'Sepeda Motor' : 'Motorcycle'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('CAR')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs border transition-colors ${
                travelMode === 'CAR'
                  ? 'border-ink bg-ink text-parchment font-medium'
                  : 'border-ash/60 bg-parchment hover:bg-parchment-border text-ink'
              }`}
            >
              <CarIcon size={16} />
              <span>{isId ? 'Mobil' : 'Car'}</span>
            </button>
          </div>
        </div>

        {/* Simulasi Akhir Pekan */}
        <div className="flex items-center justify-between p-2.5 bg-parchment border border-ash/60">
          <div>
            <span className="block text-xs font-medium text-ink">
              {isId ? 'Simulasi Puncak Akhir Pekan' : 'Simulate Weekend Peak'}
            </span>
            <span className="block text-[11px] text-graphite">
              {isId ? 'Uji kondisi macet & antrean terpadat' : 'Test heavy peak conditions'}
            </span>
          </div>
          <Switch
            checked={simulate}
            onChange={setSimulate}
            label={isId ? 'Simulasi Puncak Akhir Pekan' : 'Simulate Weekend Peak'}
          />
        </div>
      </div>

      {/* Action Footer: 1 Primary CTA */}
      <div className="pt-3 border-t border-ash/40 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs px-4 py-2.5 border border-ash/80 hover:bg-parchment text-ink font-normal transition-colors"
          >
            {isId ? '← Ganti Pilihan' : '← Change Selection'}
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onStartScan}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 bg-lime text-ink font-medium text-sm border border-ink hover:brightness-105 active:scale-[0.99] transition-all"
        >
          <span>{isId ? 'Cari Jalan & Alternatif Terbaik' : 'Find Best Route & Alternative'}</span>
          <span>→</span>
        </button>
      </div>
    </Card>
  );
}
