import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Corridor, GeoPoint, NearbyPlace, TripPlan } from '@margi-ai/shared';
import { CorridorLine } from '../../components/data/CorridorLine';
import {
  previewPinHtml,
  stopPinHtml,
  travellerHtml,
  userPinHtml,
} from '../../components/data/mapPins';
import { placeName } from '../explore/placeText';
import type { MapInsets } from '../explore/ExploreMap';

const TILE_URL: string =
  import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BALI_CENTER: L.LatLngTuple = [-8.42, 115.18];
const ARC_SEGMENTS = 28;
const ARC_BEND = 0.16;
/** Route playback length; long enough to read, short enough not to bore. */
const PLAYBACK_MS = 4200;
/** Leg lines are drawn in sequence; playback starts once the drawing settles. */
const PLAYBACK_DELAY_MS = 900;

export interface TripMapProps {
  readonly plan: TripPlan | undefined;
  readonly origin: GeoPoint;
  readonly corridors: readonly Corridor[];
  /** Place a focused suggestion would add, shown as a lime ghost pin. */
  readonly preview: NearbyPlace | null;
  /** Changing this replays the route draw and the traveller animation. */
  readonly playKey: string;
  readonly insets: MapInsets;
  readonly isId: boolean;
}

function arc(from: GeoPoint, to: GeoPoint): L.LatLngTuple[] {
  const control: L.LatLngTuple = [
    (from.lat + to.lat) / 2 + (to.lng - from.lng) * ARC_BEND,
    (from.lng + to.lng) / 2 - (to.lat - from.lat) * ARC_BEND,
  ];
  return Array.from({ length: ARC_SEGMENTS + 1 }, (_, index) => {
    const t = index / ARC_SEGMENTS;
    const u = 1 - t;
    return [
      u * u * from.lat + 2 * u * t * control[0] + t * t * to.lat,
      u * u * from.lng + 2 * u * t * control[1] + t * t * to.lng,
    ];
  });
}

function legPaths(origin: GeoPoint, plan: TripPlan | undefined): L.LatLngTuple[][] {
  if (!plan) return [];
  const points: GeoPoint[] = [origin, ...plan.stops.map((stop) => stop.place.venue)];
  // The routed road geometry when the API has it; otherwise the decorative arc.
  return points.slice(1).map((to, index) => {
    const road = plan.stops[index]?.leg.path;
    if (road && road.length >= 2) return road.map((point): L.LatLngTuple => [point.lat, point.lng]);
    return arc(points[index] ?? origin, to);
  });
}

function FitTrip({
  origin,
  plan,
  preview,
  insets,
}: Pick<TripMapProps, 'origin' | 'plan' | 'preview' | 'insets'>): null {
  const map = useMap();
  const key = [
    origin.lat,
    origin.lng,
    ...(plan?.stops.map((stop) => stop.place.venue.id) ?? []),
    preview?.venue.id ?? '',
    insets.bottom,
    insets.left,
  ].join('|');

  useEffect(() => {
    const points: L.LatLngTuple[] = [
      [origin.lat, origin.lng],
      ...(plan?.stops.map((stop): L.LatLngTuple => [stop.place.venue.lat, stop.place.venue.lng]) ??
        []),
    ];
    if (preview) points.push([preview.venue.lat, preview.venue.lng]);
    map.flyToBounds(L.latLngBounds(points), {
      paddingTopLeft: [insets.left + 120, insets.top + 48],
      paddingBottomRight: [120, insets.bottom + 48],
      maxZoom: 14,
      duration: 0.9,
    });
    // `key` summarises every input that should move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Drives a marker along the route with requestAnimationFrame; skipped for reduced motion. */
function Traveller({
  path,
  playKey,
}: {
  readonly path: L.LatLngTuple[];
  readonly playKey: string;
}) {
  const marker = useRef<L.Marker>(null);
  const icon = useMemo(
    () => L.divIcon({ className: 'mp-icon', iconSize: [0, 0], html: travellerHtml() }),
    [],
  );

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || path.length < 2) return;
    let frame = 0;
    let start = 0;
    const step = (time: number): void => {
      if (start === 0) start = time;
      const progress = Math.min(1, (time - start) / PLAYBACK_MS);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
      const position = path[Math.min(path.length - 1, Math.floor(eased * (path.length - 1)))];
      if (position) marker.current?.setLatLng(position);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, PLAYBACK_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // Replays only when the route or the replay key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  const first = path[0];
  if (!first) return null;
  return (
    <Marker
      ref={marker}
      position={first}
      icon={icon}
      keyboard={false}
      interactive={false}
      zIndexOffset={2000}
    />
  );
}

/**
 * Trip map: origin, numbered stops coloured by crowd at arrival, legs drawn in order,
 * corridors that delay the trip, a suggestion preview, and route playback.
 * Hidden from assistive technology; the itinerary panel carries the same facts.
 */
export function TripMap({
  plan,
  origin,
  corridors,
  preview,
  playKey,
  insets,
  isId,
}: TripMapProps): ReactNode {
  const legs = useMemo(() => legPaths(origin, plan), [origin, plan]);
  const route = useMemo(() => legs.flat(), [legs]);
  const activeCorridorIds = new Set(plan?.stops.flatMap((stop) => stop.leg.corridorIds) ?? []);
  const originIcon = useMemo(
    () => L.divIcon({ className: 'mp-icon', iconSize: [0, 0], html: userPinHtml(false) }),
    [],
  );
  const lastStop = plan?.stops[plan.stops.length - 1];
  const previewFrom: GeoPoint = lastStop ? lastStop.place.venue : origin;

  return (
    <div className="absolute inset-0 isolate z-0" aria-hidden="true">
      <MapContainer
        center={BALI_CENTER}
        zoom={10}
        zoomSnap={0.1}
        zoomControl={false}
        attributionControl={false}
        keyboard={false}
        className="explore-map h-full w-full"
      >
        <TileLayer url={TILE_URL} maxZoom={19} updateWhenZooming={false} keepBuffer={2} />
        <FitTrip origin={origin} plan={plan} preview={preview} insets={insets} />
        {corridors.map((corridor) => (
          <CorridorLine
            key={corridor.id}
            corridor={corridor}
            isActive={activeCorridorIds.has(corridor.id)}
          />
        ))}
        {legs.map((positions, index) => (
          <Polyline
            key={`${playKey}-base-${index}`}
            positions={positions}
            interactive={false}
            pathOptions={{ color: '#d2d2c8', weight: 6, opacity: 1 }}
          />
        ))}
        {legs.map((positions, index) => (
          <Polyline
            key={`${playKey}-leg-${index}`}
            positions={positions}
            interactive={false}
            pathOptions={{
              color: '#14140f',
              weight: 3,
              className: `trip-leg trip-leg--${Math.min(index, 4)}`,
            }}
          />
        ))}
        {preview && (
          <Polyline
            positions={arc(previewFrom, preview.venue)}
            interactive={false}
            pathOptions={{ color: '#14140f', weight: 2, className: 'mp-route' }}
          />
        )}
        <Marker
          position={[origin.lat, origin.lng]}
          icon={originIcon}
          keyboard={false}
          interactive={false}
        />
        {plan?.stops.map((stop, index) => (
          <Marker
            key={`${stop.place.venue.id}-${index}`}
            position={[stop.place.venue.lat, stop.place.venue.lng]}
            keyboard={false}
            interactive={false}
            zIndexOffset={1000 - index}
            icon={L.divIcon({
              className: 'mp-icon',
              iconSize: [0, 0],
              html: stopPinHtml({
                order: index + 1,
                busynessPct: stop.place.crowd.busynessPct,
                name: placeName(stop.place.venue, isId),
                isRedZone: stop.isRedZone,
                isOpen: stop.place.isOpenNow,
                isMsme: stop.place.venue.kind === 'MSME',
              }),
            })}
          />
        ))}
        {preview && (
          <Marker
            position={[preview.venue.lat, preview.venue.lng]}
            keyboard={false}
            interactive={false}
            zIndexOffset={1500}
            icon={L.divIcon({
              className: 'mp-icon',
              iconSize: [0, 0],
              html: previewPinHtml(placeName(preview.venue, isId)),
            })}
          />
        )}
        <Traveller key={playKey} path={route} playKey={playKey} />
      </MapContainer>
    </div>
  );
}
