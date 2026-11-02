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
  let label = '';
  let size = isActive ? 34 : 26;

  if (kind === 'origin') {
    // Red origin hotspot
    bgClass = 'bg-[#e0442b] text-white';
    borderClass = isActive
      ? 'border-2 border-white ring-4 ring-[#e0442b]/40'
      : 'border-2 border-white';
    label = '📍';
  } else if (kind === 'alternative') {
    // Green alternative
    bgClass = 'bg-[#2f9e5b] text-white';
    borderClass = isActive
      ? 'border-2 border-white ring-4 ring-[#2f9e5b]/40'
      : 'border-2 border-white';
    label = '✦';
  } else {
    // MSME: dark with lime border
    bgClass = 'bg-[#14140f] text-[#beff50]';
    borderClass = 'border-2 border-[#beff50]';
    label = '🛍';
    size = 22;
  }

  const html = `
    <div style="width: ${size}px; height: ${size}px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: ${
    size > 24 ? '13px' : '10px'
  }; font-weight: 500;" class="${bgClass} ${borderClass}">
      ${label}
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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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

  // Compile list of markers
  const markers = useMemo<InternalMarker[]>(() => {
    const list: InternalMarker[] = [];

    // 1. Origin Hotspot
    list.push({
      id: origin.id,
      lat: origin.lat,
      lng: origin.lng,
      title: origin.name,
      kind: 'origin',
      isActive: false,
    });

    // 2. Alternatives & their MSMEs
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

      // Add MSMEs paired with this alternative
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
      {/* Header with Title and Mobile Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-pill bg-parchment text-graphite border border-ash font-medium">
              Spatial Overview
            </span>
          </div>
          <h3 className="text-xl font-medium text-ink mt-1 leading-snug">
            {t('mapSectionTitle', 'Interactive Route Map')}
          </h3>
          <p className="text-xs text-graphite mt-0.5">
            {t(
              'mapSectionSubtitle',
              'Spatial overview of origin hotspot, alternatives, and local MSMEs',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="md:hidden px-3 py-1.5 rounded-inner bg-parchment text-ink border border-ash text-xs font-mono font-medium hover:bg-ash/50 transition-colors"
          data-testid="toggle-map-button"
        >
          {isCollapsed ? t('showMap', 'Show Map') : t('hideMap', 'Hide Map')}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs font-mono text-graphite pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#e0442b] border border-white inline-block" />
          <span>{t('originHotspot', 'Origin Hotspot')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#2f9e5b] border border-white inline-block" />
          <span>{t('recommendedAlt', 'Recommended Alternative')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#14140f] border border-[#beff50] inline-block" />
          <span>{t('localMsme', 'Local MSME')}</span>
        </div>
      </div>

      {/* Map Container (aria-hidden for screen readers per AC-09.4) */}
      {!isCollapsed ? (
        <div
          aria-hidden="true"
          className="relative w-full h-80 sm:h-96 rounded-inner overflow-hidden border border-ash bg-parchment"
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
                    <span className="text-[10px] uppercase font-mono text-stone">
                      {marker.kind === 'origin'
                        ? 'Origin'
                        : marker.kind === 'alternative'
                          ? 'Alternative'
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
