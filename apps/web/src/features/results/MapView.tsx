import { type ReactNode, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteCard as RouteCardType } from '@margi-ai/shared';

export interface MapOriginLocation {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
}

export interface MapViewProps {
  readonly origin: MapOriginLocation;
  readonly alternatives: readonly RouteCardType[];
  readonly activeCardId?: string | null | undefined;
  readonly onSelectCard?: ((cardId: string) => void) | undefined;
  readonly className?: string | undefined;
}

interface InternalMarker {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly title: string;
  readonly kind: 'origin' | 'alternative' | 'msme';
  readonly isActive: boolean;
}

function createCustomIcon(kind: 'origin' | 'alternative' | 'msme', isActive: boolean): L.DivIcon {
  let bgClass = '';
  let borderClass = '';
  let svgGlyph = '';
  let size = isActive ? 34 : 26;

  if (kind === 'origin') {
    bgClass = 'bg-[#e0442b] text-white';
    borderClass = isActive
      ? 'border-2 border-white ring-4 ring-[#e0442b]/40'
      : 'border-2 border-white';
    svgGlyph =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  } else if (kind === 'alternative') {
    bgClass = 'bg-[#2f9e5b] text-white';
    borderClass = isActive
      ? 'border-2 border-white ring-4 ring-[#2f9e5b]/40'
      : 'border-2 border-white';
    svgGlyph =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m8.5 12.5 2.3 2.3 4.7-5"/><circle cx="12" cy="12" r="9"/></svg>';
  } else {
    bgClass = 'bg-[#14140f] text-[#beff50]';
    borderClass = 'border-2 border-[#beff50]';
    svgGlyph =
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M5 12v8h14v-8"/></svg>';
    size = 24;
  }

  const html = `
    <div style="width: ${size}px; height: ${size}px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;" class="${bgClass} ${borderClass}">
      ${svgGlyph}
    </div>
  `;

  return L.divIcon({
    className: 'margi-map-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function BoundsController({ markers }: { markers: readonly InternalMarker[] }): null {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    try {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    } catch {
      // Ignore bounds error if container is zero-sized in testing
    }
  }, [markers, map]);

  return null;
}

export function MapView({
  origin,
  alternatives,
  activeCardId,
  onSelectCard,
  className = '',
}: MapViewProps): ReactNode {
  const { t, i18n } = useTranslation('results');
  const isId = i18n?.language?.startsWith('id') ?? false;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const markers = useMemo<InternalMarker[]>(() => {
    const list: InternalMarker[] = [];

    list.push({
      id: origin.id,
      lat: origin.lat,
      lng: origin.lng,
      title: origin.name,
      kind: 'origin',
      isActive: false,
    });

    for (const alt of alternatives) {
      const altName = isId
        ? alt.venue.nameId || alt.venue.nameEn
        : alt.venue.nameEn || alt.venue.nameId;
      const isAltActive = alt.venue.id === activeCardId;

      list.push({
        id: alt.venue.id,
        lat: alt.venue.lat,
        lng: alt.venue.lng,
        title: altName,
        kind: 'alternative',
        isActive: isAltActive,
      });

      for (const m of alt.msme) {
        const msmeName = isId
          ? m.venue.nameId || m.venue.nameEn
          : m.venue.nameEn || m.venue.nameId;
        list.push({
          id: m.venue.id,
          lat: m.venue.lat,
          lng: m.venue.lng,
          title: msmeName,
          kind: 'msme',
          isActive: false,
        });
      }
    }

    return list;
  }, [origin, alternatives, activeCardId, isId]);

  const center: [number, number] = [origin.lat || -8.4095, origin.lng || 115.1889];

  return (
    <section
      className={`rounded-card bg-white border border-ash p-5 sm:p-6 text-ink space-y-4 ${className}`}
      data-testid="map-view-section"
    >
      {/* Clean Human Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-subheading font-medium text-ink leading-snug">
            {t('mapSectionTitle', isId ? 'Peta Lokasi & UMKM Sekitar' : 'Interactive Map')}
          </h3>
          <p className="text-xs text-graphite mt-0.5">
            {t(
              'mapSectionSubtitle',
              isId
                ? 'Lihat posisi lokasi awal, tempat serupa yang tenang, dan UMKM lokal terdekat'
                : 'Explore the original spot, calmer alternatives, and nearby local businesses',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="md:hidden px-3 py-1.5 rounded-pill bg-parchment text-ink border border-ash text-xs font-medium hover:bg-ash/50 transition-colors cursor-pointer"
          data-testid="toggle-map-button"
        >
          {isCollapsed
            ? isId
              ? 'Buka Peta'
              : 'Show Map'
            : isId
              ? 'Tutup Peta'
              : 'Hide Map'}
        </button>
      </div>

      {/* Simple Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-graphite">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#e0442b] border border-white inline-block" />
          <span>{isId ? 'Lokasi awal (ramai)' : 'Original busy spot'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#2f9e5b] border border-white inline-block" />
          <span>{isId ? 'Tempat serupa (tenang)' : 'Calmer similar place'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#14140f] border border-[#beff50] inline-block" />
          <span>{isId ? 'UMKM terdekat' : 'Nearby local MSME'}</span>
        </div>
      </div>

      {!isCollapsed ? (
        <div
          aria-hidden="true"
          className="relative w-full h-72 sm:h-88 rounded-inner overflow-hidden border border-ash bg-parchment"
          data-testid="leaflet-map-wrapper"
        >
          <MapContainer
            center={center}
            zoom={11}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <BoundsController markers={markers} />

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={createCustomIcon(marker.kind, marker.isActive)}
                eventHandlers={{
                  click: () => {
                    if (marker.kind === 'alternative' && onSelectCard) {
                      onSelectCard(marker.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <strong className="font-medium block text-ink">{marker.title}</strong>
                    <span className="text-[11px] text-graphite">
                      {marker.kind === 'origin'
                        ? isId
                          ? 'Lokasi awal'
                          : 'Original spot'
                        : marker.kind === 'alternative'
                          ? isId
                            ? 'Tempat serupa'
                            : 'Calmer spot'
                          : isId
                            ? 'UMKM lokal'
                            : 'Local MSME'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : null}
    </section>
  );
}
