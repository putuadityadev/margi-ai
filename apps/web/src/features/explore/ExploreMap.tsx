import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, NearbyPlace } from '@margi-ai/shared';
import {
  clusterPinHtml,
  placePinHtml,
  userPinHtml,
  type PinState,
} from '../../components/data/mapPins';
import type { ExploreStep } from '../../stores/exploreStore';
import '../../styles/map-cluster.css';
import { clusterPins, type PinGroup } from './clusterPins';

/**
 * Raster basemap. Defaults to the public OpenStreetMap tiles (no key; fine for a prototype
 * under the OSM tile usage policy). Production should point VITE_MAP_TILE_URL at a keyed
 * provider. Attribution is rendered by the page, outside the aria-hidden map.
 */
const TILE_URL: string =
  import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BALI_CENTER: L.LatLngTuple = [-8.42, 115.18];
const BALI_ZOOM = 9.4;
const LOCATE_ZOOM = 15;
const VIBE_ZOOM = 13.5;
const SCAN_START_ZOOM = 14;
const SCAN_END_ZOOM = 10.6;
const BROWSE_FIT_COUNT = 8;
const ROUTE_ARC_SEGMENTS = 32;
/** Bend of the route arc as a share of the straight-line length. */
const ROUTE_ARC_BEND = 0.18;
const PIN_REVEAL_LEAD_MS = 500;
/** Pins closer than this on screen merge into one cluster marker (about one chip width). */
const CLUSTER_RADIUS_PX = 44;
/**
 * Clicking a cluster zooms to at most this level, and pins stop clustering here, so a click
 * always splits the cluster into individual pins.
 */
const CLUSTER_MAX_ZOOM = 15;
/** Focused or selected pins carry the story, so they always render on their own. */
const UNCLUSTERED_STATES: ReadonlySet<PinState> = new Set(['active', 'target', 'alternative']);

export interface MapInsets {
  /** Pixels covered by UI at the bottom of the map (mobile sheet). */
  readonly bottom: number;
  /** Pixels covered by UI on the left (desktop panel). */
  readonly left: number;
  /** Pixels covered by the floating top bar. */
  readonly top: number;
}

export interface MapFocus {
  readonly targetId: string;
  readonly alternativeIds: readonly string[];
}

export interface ExploreMapProps {
  readonly step: ExploreStep;
  readonly origin: GeoPoint | null;
  readonly places: readonly NearbyPlace[];
  readonly activePlaceId: string | null;
  readonly focus: MapFocus | null;
  readonly scanRun: number;
  readonly scanDurationMs: number;
  readonly locale: 'en' | 'id';
  readonly insets: MapInsets;
  readonly onPickPlace: (placeId: string) => void;
  /** Fired when the traveller drags the map during the locate step. */
  readonly onCenterChange: (point: GeoPoint) => void;
  readonly onDragChange: (dragging: boolean) => void;
}

/** Focused pins show their name beside the value, so they need extra horizontal room. */
const LABEL_ROOM_PX = 110;

function paddingOf(insets: MapInsets, withLabels = false): L.FitBoundsOptions {
  const side = withLabels ? LABEL_ROOM_PX : 40;
  return {
    paddingTopLeft: [insets.left + side, insets.top + 40],
    paddingBottomRight: [side, insets.bottom + 40],
  };
}

/**
 * Map centre that places `point` in the middle of the part of the map not covered by UI
 * (bottom sheet on phones, left panel on wide screens).
 */
function visibleCenter(map: L.Map, point: GeoPoint, zoom: number, insets: MapInsets): L.LatLng {
  const projected = map.project([point.lat, point.lng], zoom);
  const shifted = projected.add([-insets.left / 2, (insets.bottom - insets.top) / 2]);
  return map.unproject(shifted, zoom);
}

/** Quadratic arc between two points, bent to the left of travel, for an Uber-like route line. */
function routeArc(from: GeoPoint, to: GeoPoint): L.LatLngTuple[] {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const control: L.LatLngTuple = [
    midLat + (to.lng - from.lng) * ROUTE_ARC_BEND,
    midLng - (to.lat - from.lat) * ROUTE_ARC_BEND,
  ];
  return Array.from({ length: ROUTE_ARC_SEGMENTS + 1 }, (_, index) => {
    const t = index / ROUTE_ARC_SEGMENTS;
    const u = 1 - t;
    return [
      u * u * from.lat + 2 * u * t * control[0] + t * t * to.lat,
      u * u * from.lng + 2 * u * t * control[1] + t * t * to.lng,
    ];
  });
}

/** Moves the camera for each step. Runs only when the step or its inputs change. */
function CameraDirector({
  step,
  origin,
  places,
  activePlaceId,
  focus,
  scanRun,
  scanDurationMs,
  insets,
}: Pick<
  ExploreMapProps,
  'step' | 'origin' | 'places' | 'activePlaceId' | 'focus' | 'scanRun' | 'scanDurationMs' | 'insets'
>): null {
  const map = useMap();
  const lastLocateOrigin = useRef<GeoPoint | null>(null);
  const originKey = origin ? `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : '';
  const placesKey = places.map((place) => place.venue.id).join('|');

  // Intro and locate: overview, then fly to the chosen point unless the user is dragging it.
  useEffect(() => {
    if (step === 'intro') {
      map.setView(BALI_CENTER, BALI_ZOOM, { animate: false });
      return;
    }
    if (step !== 'locate' || !origin) return;
    const last = lastLocateOrigin.current;
    const center = map.getCenter();
    const alreadyCentered =
      Math.abs(center.lat - origin.lat) < 1e-5 && Math.abs(center.lng - origin.lng) < 1e-5;
    if (!alreadyCentered && (!last || last.lat !== origin.lat || last.lng !== origin.lng)) {
      map.flyTo([origin.lat, origin.lng], LOCATE_ZOOM, { duration: 1.4 });
    }
    lastLocateOrigin.current = origin;
    // originKey captures origin changes without re-running on identity-only updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, step, originKey]);

  useEffect(() => {
    if (step === 'vibe' && origin) {
      map.flyTo(visibleCenter(map, origin, VIBE_ZOOM, insets), VIBE_ZOOM, { duration: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, step, insets.bottom]);

  // Scan: snap close, then pull back slowly while the radar runs.
  useEffect(() => {
    if (step !== 'scan' || !origin) return;
    map.setView(visibleCenter(map, origin, SCAN_START_ZOOM, insets), SCAN_START_ZOOM, {
      animate: false,
    });
    map.flyTo(visibleCenter(map, origin, SCAN_END_ZOOM, insets), SCAN_END_ZOOM, {
      duration: (scanDurationMs / 1000) * 0.85,
      easeLinearity: 0.15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, step, scanRun]);

  // Browse without focus: frame the traveller and the nearest places.
  useEffect(() => {
    if (step !== 'browse' || !origin || focus) return;
    const points = places
      .slice(0, BROWSE_FIT_COUNT)
      .map((place): L.LatLngTuple => [place.venue.lat, place.venue.lng]);
    if (points.length === 0) return;
    map.flyToBounds(L.latLngBounds([[origin.lat, origin.lng], ...points]), {
      ...paddingOf(insets),
      duration: 0.9,
      maxZoom: 14,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, step, placesKey, focus === null, insets.bottom, insets.left]);

  // Focus (detail open): frame traveller, target and its calmer alternatives.
  useEffect(() => {
    if (!focus || !origin) return;
    const ids = new Set([focus.targetId, ...focus.alternativeIds]);
    const points = places
      .filter((place) => ids.has(place.venue.id))
      .map((place): L.LatLngTuple => [place.venue.lat, place.venue.lng]);
    map.flyToBounds(L.latLngBounds([[origin.lat, origin.lng], ...points]), {
      ...paddingOf(insets, true),
      duration: 0.9,
      maxZoom: 14,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    map,
    focus?.targetId,
    focus?.alternativeIds.join('|'),
    placesKey,
    insets.bottom,
    insets.left,
  ]);

  // Carousel focus: keep the active pin inside the visible part of the map.
  useEffect(() => {
    if (step !== 'browse' || focus || !activePlaceId) return;
    const place = places.find((candidate) => candidate.venue.id === activePlaceId);
    if (!place) return;
    map.panInside([place.venue.lat, place.venue.lng], paddingOf(insets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activePlaceId]);

  return null;
}

function LocateTracker({
  enabled,
  onCenterChange,
  onDragChange,
}: {
  readonly enabled: boolean;
  readonly onCenterChange: (point: GeoPoint) => void;
  readonly onDragChange: (dragging: boolean) => void;
}): null {
  const dragged = useRef(false);
  useMapEvents({
    dragstart: () => {
      if (!enabled) return;
      dragged.current = true;
      onDragChange(true);
    },
    moveend: (event) => {
      if (!enabled || !dragged.current) return;
      dragged.current = false;
      onDragChange(false);
      const center = (event.target as L.Map).getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    },
  });
  return null;
}

function pinStateOf(
  placeId: string,
  activePlaceId: string | null,
  focus: MapFocus | null,
): PinState {
  if (focus) {
    if (placeId === focus.targetId) return 'target';
    if (focus.alternativeIds.includes(placeId)) return 'alternative';
    return 'muted';
  }
  return placeId === activePlaceId ? 'active' : 'idle';
}

interface PlaceMarkerProps {
  readonly place: NearbyPlace;
  readonly state: PinState;
  readonly name: string;
  readonly revealDelayMs: number | null;
  readonly onPick: (placeId: string) => void;
}

function PlaceMarker({ place, state, name, revealDelayMs, onPick }: PlaceMarkerProps): ReactNode {
  const { busynessPct } = place.crowd;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'mp-icon',
        iconSize: [0, 0],
        html: placePinHtml({
          busynessPct,
          name,
          state,
          isMsme: place.venue.kind === 'MSME',
          isOpen: place.isOpenNow,
          revealDelayMs,
        }),
      }),
    [busynessPct, name, state, place.venue.kind, place.isOpenNow, revealDelayMs],
  );
  const zIndex =
    state === 'target' ? 1000 : state === 'active' || state === 'alternative' ? 500 : 0;

  return (
    <Marker
      position={[place.venue.lat, place.venue.lng]}
      icon={icon}
      keyboard={false}
      zIndexOffset={zIndex}
      eventHandlers={{ click: () => onPick(place.venue.id) }}
    />
  );
}

interface ClusterMarkerProps {
  readonly members: readonly NearbyPlace[];
  readonly muted: boolean;
  readonly onZoomTo: (members: readonly NearbyPlace[]) => void;
}

function ClusterMarker({ members, muted, onZoomTo }: ClusterMarkerProps): ReactNode {
  const open = members.filter((member) => member.isOpenNow);
  const maxBusynessPct =
    open.length > 0 ? Math.max(...open.map((member) => member.crowd.busynessPct)) : null;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'mp-icon',
        iconSize: [0, 0],
        html: clusterPinHtml({ count: members.length, maxBusynessPct, muted }),
      }),
    [members.length, maxBusynessPct, muted],
  );
  const lat = members.reduce((sum, member) => sum + member.venue.lat, 0) / members.length;
  const lng = members.reduce((sum, member) => sum + member.venue.lng, 0) / members.length;

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      keyboard={false}
      eventHandlers={{ click: () => onZoomTo(members) }}
    />
  );
}

type PlaceLayerProps = Pick<
  ExploreMapProps,
  'step' | 'places' | 'activePlaceId' | 'focus' | 'scanRun' | 'locale' | 'insets' | 'onPickPlace'
> & {
  readonly revealDelays: ReadonlyMap<string, number>;
};

/**
 * Place pins, with overlapping ones merged into cluster markers while browsing. Clustering is
 * off during the scan so the radar reveal can pop each pin on its own.
 */
function PlaceLayer(props: PlaceLayerProps): ReactNode {
  const { step, places, activePlaceId, focus, scanRun, locale, insets, revealDelays } = props;
  const scanning = step === 'scan';
  // Zoom after the last zoomend; null until the first one, when clustering is always on.
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({
    zoomend: (event) => setZoom((event.target as L.Map).getZoom()),
  });
  const clustering = step === 'browse' && (zoom === null || zoom < CLUSTER_MAX_ZOOM);
  const unclusteredKey = places
    .filter((place) => UNCLUSTERED_STATES.has(pinStateOf(place.venue.id, activePlaceId, focus)))
    .map((place) => place.venue.id)
    .join('|');

  // Projected at the settled zoom and recomputed on zoomend rather than every render, so
  // renders during a camera flight do not regroup pins at an intermediate zoom.
  const groups = useMemo((): PinGroup[] => {
    if (!clustering) return places.map((place) => ({ kind: 'single', id: place.venue.id }));
    const nearestFirst = [...places].sort((a, b) => a.distanceKm - b.distanceKm);
    const screenPins = nearestFirst.map((place) => {
      const point = map.project([place.venue.lat, place.venue.lng], zoom ?? undefined);
      return { id: place.venue.id, x: point.x, y: point.y };
    });
    return clusterPins(screenPins, {
      radiusPx: CLUSTER_RADIUS_PX,
      excludedIds: new Set(unclusteredKey.split('|')),
    });
  }, [map, places, clustering, unclusteredKey, zoom]);

  const byId = new Map(places.map((place) => [place.venue.id, place]));
  const zoomToMembers = (members: readonly NearbyPlace[]): void => {
    const points = members.map((place): L.LatLngTuple => [place.venue.lat, place.venue.lng]);
    map.flyToBounds(L.latLngBounds(points), {
      ...paddingOf(insets),
      duration: 0.9,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
  };

  return groups.map((group) => {
    if (group.kind === 'cluster') {
      const members = group.ids.flatMap((id) => byId.get(id) ?? []);
      return (
        <ClusterMarker
          key={`cluster-${group.ids.join('|')}`}
          members={members}
          muted={focus !== null}
          onZoomTo={zoomToMembers}
        />
      );
    }
    const place = byId.get(group.id);
    if (!place) return null;
    return (
      <PlaceMarker
        key={`${place.venue.id}-${scanRun}`}
        place={place}
        name={locale === 'id' ? place.venue.nameId : place.venue.nameEn}
        state={pinStateOf(place.venue.id, activePlaceId, focus)}
        revealDelayMs={scanning ? (revealDelays.get(place.venue.id) ?? 0) : null}
        onPick={props.onPickPlace}
      />
    );
  });
}

/**
 * Full-bleed explore map. It duplicates what the panels show, so it is hidden from
 * assistive technology; every action is also reachable through the panels.
 */
export function ExploreMap(props: ExploreMapProps): ReactNode {
  const { step, origin, places, focus, scanRun, scanDurationMs } = props;
  const showPlaces = step === 'scan' || step === 'browse';
  const showUser = origin !== null && step !== 'locate' && step !== 'intro';
  const scanning = step === 'scan';

  const userIcon = useMemo(
    () => L.divIcon({ className: 'mp-icon', iconSize: [0, 0], html: userPinHtml(scanning) }),
    [scanning],
  );

  // Pins reveal in distance order, timed to the radar sweep; afterwards they appear at once.
  const revealDelays = useMemo(() => {
    const delays = new Map<string, number>();
    const farthest = Math.max(1, ...places.map((place) => place.distanceKm));
    for (const place of places) {
      const share = place.distanceKm / farthest;
      delays.set(
        place.venue.id,
        Math.round(PIN_REVEAL_LEAD_MS + share * (scanDurationMs - PIN_REVEAL_LEAD_MS * 2)),
      );
    }
    return delays;
    // scanRun restarts the choreography for a new scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, scanDurationMs, scanRun]);

  const target = focus ? places.find((place) => place.venue.id === focus.targetId) : undefined;

  return (
    // `isolate` keeps Leaflet's internal pane z-indexes (400+) below the app's sheets.
    <div className="absolute inset-0 isolate z-0" aria-hidden="true">
      <MapContainer
        center={BALI_CENTER}
        zoom={BALI_ZOOM}
        zoomSnap={0.1}
        zoomControl={false}
        attributionControl={false}
        keyboard={false}
        scrollWheelZoom={step === 'locate' ? 'center' : true}
        touchZoom={step === 'locate' ? 'center' : true}
        className="explore-map h-full w-full"
      >
        <TileLayer url={TILE_URL} maxZoom={19} updateWhenZooming={false} keepBuffer={2} />
        <CameraDirector {...props} />
        <LocateTracker
          enabled={step === 'locate'}
          onCenterChange={props.onCenterChange}
          onDragChange={props.onDragChange}
        />
        {showUser && origin && (
          <Marker
            position={[origin.lat, origin.lng]}
            icon={userIcon}
            keyboard={false}
            interactive={false}
            zIndexOffset={-100}
          />
        )}
        {showUser && origin && target && (
          <Polyline
            positions={routeArc(origin, target.venue)}
            pathOptions={{ color: '#14140f', weight: 2.5, className: 'mp-route' }}
          />
        )}
        {showPlaces && <PlaceLayer {...props} revealDelays={revealDelays} />}
      </MapContainer>
    </div>
  );
}
