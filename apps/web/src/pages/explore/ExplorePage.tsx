import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import {
  EXPLORE_RADIUS_KM,
  isInBali,
  type Area,
  type GeoPoint,
  type NearbyPlace,
} from '@margi-ai/shared';
import { BrowsePanel } from '../../features/explore/BrowsePanel';
import { ExploreMap, type MapFocus, type MapInsets } from '../../features/explore/ExploreMap';
import { ExploreTopBar } from '../../features/explore/ExploreTopBar';
import { IntroOnboarding } from '../../features/explore/IntroOnboarding';
import { LocateSheet, type LocateNotice } from '../../features/explore/LocateSheet';
import { PlaceDetailPanel } from '../../features/explore/PlaceDetailPanel';
import { ScanSheet } from '../../features/explore/ScanSheet';
import { VibeSheet } from '../../features/explore/VibeSheet';
import {
  useAreas,
  useNearby,
  usePlaceDetail,
  useReverseGeocode,
  type ExploreParams,
} from '../../features/explore/queries';
import { useGeolocation } from '../../features/explore/useGeolocation';
import { AssistSheet, type AssistChoice } from '../../features/trip/AssistSheet';
import {
  gridlockExampleDepartAt,
  nowWitaIso,
  UBUD_GRIDLOCK_EXAMPLE,
} from '../../features/trip/tripStart';
import { useTripStore } from '../../stores/tripStore';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useExploreStore, visitInstant } from '../../stores/exploreStore';

/** Radar choreography length; the scan never resolves faster than this. */
const SCAN_DURATION_MS = 3600;
const TOP_BAR_PX = 64;
const DESKTOP_PANEL_PX = 416;

interface DetailHistoryState {
  readonly fromDetail?: boolean;
}

function mergePlaces(...groups: ReadonlyArray<readonly NearbyPlace[]>): NearbyPlace[] {
  const byId = new Map<string, NearbyPlace>();
  for (const group of groups) {
    for (const place of group) {
      if (!byId.has(place.venue.id)) byId.set(place.venue.id, place);
    }
  }
  return [...byId.values()];
}

/** Gojek-style centre pin shown while the traveller fine-tunes the starting point. */
function CenterPin({ lifted }: { readonly lifted: boolean }): ReactNode {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 z-10" aria-hidden="true">
      <div className="center-pin -translate-x-1/2 -translate-y-full" data-lifted={lifted}>
        <span className="mx-auto block h-6 w-6 border-2 border-ink bg-lime" />
        <span className="mx-auto block h-4 w-[2px] bg-ink" />
      </div>
      <span className="absolute top-0 left-0 block h-[2px] w-3 -translate-x-1/2 -translate-y-1/2 bg-ink" />
      <span className="absolute top-0 left-0 block h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-ink" />
    </div>
  );
}

/**
 * `/app`: the map-first explore flow (DECISIONS D-025).
 * intro → locate (GPS or manual, drag to correct) → mood → radar scan → browse → place detail.
 */
export function ExplorePage(): ReactNode {
  const { i18n } = useTranslation('explore');
  const isId = i18n.language.startsWith('id');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const store = useExploreStore(
    useShallow((s) => ({
      step: s.step,
      origin: s.origin,
      originSource: s.originSource,
      vibes: s.vibes,
      visitWindow: s.visitWindow,
      sort: s.sort,
      activePlaceId: s.activePlaceId,
      scanRun: s.scanRun,
    })),
  );
  const actions = useExploreStore(
    useShallow((s) => ({
      finishIntro: s.finishIntro,
      setOrigin: s.setOrigin,
      clearOrigin: s.clearOrigin,
      confirmOrigin: s.confirmOrigin,
      toggleVibe: s.toggleVibe,
      startScan: s.startScan,
      finishScan: s.finishScan,
      goTo: s.goTo,
      setVisitWindow: s.setVisitWindow,
      setSort: s.setSort,
      setActivePlace: s.setActivePlace,
    })),
  );
  const { step, origin, vibes, scanRun } = store;

  const [sheetHeight, setSheetHeight] = useState(0);
  const [detailHeight, setDetailHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [outsideBali, setOutsideBali] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const startTrip = useTripStore((s) => s.start);
  /** scanRun whose minimum radar duration has elapsed. */
  const [elapsedScanRun, setElapsedScanRun] = useState(-1);

  const areas = useAreas();
  const reverse = useReverseGeocode(origin);
  const gps = useGeolocation((point) => {
    const inside = isInBali(point);
    setOutsideBali(!inside);
    if (inside) actions.setOrigin(point, 'gps');
  });
  const gpsFailure: LocateNotice =
    gps.status === 'denied' || gps.status === 'unavailable' ? gps.status : null;
  const notice: LocateNotice = outsideBali ? 'outside' : gpsFailure;

  // The visit instant is fixed per scan or visit-window change, so query keys stay stable.
  const at = useMemo(
    () => visitInstant(store.visitWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.visitWindow, scanRun],
  );
  const params: ExploreParams | null = origin ? { origin, vibes, at } : null;
  const nearby = useNearby(step === 'scan' || step === 'browse' ? params : null);

  useEffect(() => {
    if (step !== 'scan') return;
    const timer = window.setTimeout(() => setElapsedScanRun(scanRun), SCAN_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [step, scanRun]);
  const scanElapsed = elapsedScanRun === scanRun;

  useEffect(() => {
    if (step === 'scan' && scanElapsed && nearby.isSuccess && !nearby.isPlaceholderData) {
      actions.finishScan();
    }
  }, [step, scanElapsed, nearby.isSuccess, nearby.isPlaceholderData, actions]);

  const selectedId = origin && step === 'browse' ? searchParams.get('place') : null;
  const detail = usePlaceDetail(selectedId, params);
  const canGoBack = Boolean((location.state as DetailHistoryState | null)?.fromDetail);

  const openPlace = useCallback(
    (placeId: string) => {
      actions.setActivePlace(placeId);
      void navigate(`/app?place=${encodeURIComponent(placeId)}`, {
        state: { fromDetail: selectedId !== null },
      });
    },
    [actions, navigate, selectedId],
  );
  const closeDetail = useCallback(() => {
    void navigate('/app', { replace: true });
  }, [navigate]);

  const originLabel = (): string => {
    const area = reverse.data?.area;
    return area ? (isId ? area.nameId : area.nameEn) : '—';
  };

  /** Hands the current context to the trip planner (D-026). */
  const planTrip = (placeId: string | null, choice: AssistChoice): void => {
    if (!origin) return;
    const departAt = visitInstant(store.visitWindow) ?? nowWitaIso();
    const stops = placeId && choice !== 'has-plan' ? [{ venueId: placeId }] : [];
    if (choice === 'stuck-example') {
      startTrip(
        {
          origin: UBUD_GRIDLOCK_EXAMPLE.origin,
          originLabel: UBUD_GRIDLOCK_EXAMPLE.label,
          departAt: gridlockExampleDepartAt(),
          stops,
        },
        'STUCK_IN_TRAFFIC',
      );
    } else {
      const situation =
        choice === 'stuck-here' ? 'STUCK_IN_TRAFFIC' : choice === 'has-plan' ? 'HAS_PLAN' : 'PLAN';
      startTrip(
        {
          origin,
          originLabel: originLabel(),
          departAt: choice === 'stuck-here' ? nowWitaIso() : departAt,
          stops,
        },
        situation,
      );
    }
    void navigate('/app/trip');
  };

  const pickArea = useCallback(
    (area: Area) => {
      setOutsideBali(false);
      actions.setOrigin({ lat: area.lat, lng: area.lng }, 'area');
    },
    [actions],
  );
  const onCenterChange = useCallback(
    (point: GeoPoint) => actions.setOrigin(point, 'map'),
    [actions],
  );

  const scanPlaces = step === 'scan' && nearby.isPlaceholderData ? [] : (nearby.data?.places ?? []);
  const detailData = selectedId ? detail.data : undefined;
  const mapPlaces = detailData
    ? mergePlaces(
        scanPlaces,
        [detailData.place],
        detailData.alternatives.map((alternative) => alternative.place),
        detailData.nearbyMsmes,
      )
    : scanPlaces;
  const focus: MapFocus | null = detailData
    ? {
        targetId: detailData.place.venue.id,
        alternativeIds: detailData.alternatives.map((alternative) => alternative.place.venue.id),
      }
    : null;

  const insets: MapInsets = isDesktop
    ? { left: DESKTOP_PANEL_PX, bottom: 0, top: TOP_BAR_PX }
    : { left: 0, top: TOP_BAR_PX, bottom: selectedId ? detailHeight : sheetHeight };

  // Old landing deep links (`/app?preset=…`) belong to the photo analyzer.
  if (searchParams.get('preset')) {
    return <Navigate to={`/app/photo?${searchParams.toString()}`} replace />;
  }

  // The assistant plans around the place in focus, else the nearest result.
  const assistPlace =
    scanPlaces.find((place) => place.venue.id === store.activePlaceId) ?? scanPlaces[0] ?? null;
  const areaName = reverse.data
    ? isId
      ? reverse.data.area.nameId
      : reverse.data.area.nameEn
    : null;
  const showTopLocation = origin !== null && step !== 'locate' && step !== 'intro';

  return (
    <main id="main-content" className="fixed inset-0 overflow-hidden bg-parchment text-ink">
      <ExploreMap
        step={step}
        origin={origin}
        places={mapPlaces}
        activePlaceId={store.activePlaceId}
        focus={focus}
        scanRun={scanRun}
        scanDurationMs={SCAN_DURATION_MS}
        locale={isId ? 'id' : 'en'}
        insets={insets}
        onPickPlace={(placeId) =>
          selectedId ? openPlace(placeId) : actions.setActivePlace(placeId)
        }
        onCenterChange={onCenterChange}
        onDragChange={setDragging}
      />

      {step === 'locate' && origin && <CenterPin lifted={dragging} />}

      {step !== 'intro' && (
        <ExploreTopBar
          locationLabel={showTopLocation ? (areaName ?? '…') : null}
          onChangeLocation={() => {
            closeDetail();
            actions.goTo('locate');
          }}
          onRescan={step === 'browse' ? () => actions.startScan() : null}
        />
      )}

      {step === 'intro' && <IntroOnboarding onDone={actions.finishIntro} />}

      {step === 'locate' && (
        <LocateSheet
          origin={origin}
          originSource={store.originSource}
          place={reverse.data}
          areas={areas.data ?? []}
          gpsStatus={gps.status}
          notice={notice}
          onUseGps={gps.request}
          onPickArea={pickArea}
          onConfirm={actions.confirmOrigin}
          onChange={actions.clearOrigin}
          onHeightChange={setSheetHeight}
        />
      )}

      {step === 'vibe' && (
        <VibeSheet
          selected={vibes}
          onToggle={actions.toggleVibe}
          onScan={() => actions.startScan()}
          onSkip={() => actions.startScan([])}
          onHeightChange={setSheetHeight}
        />
      )}

      {(step === 'scan' || (step === 'browse' && nearby.isError && !nearby.data)) && (
        <ScanSheet
          key={scanRun}
          scanRun={scanRun}
          durationMs={SCAN_DURATION_MS}
          radiusKm={EXPLORE_RADIUS_KM.default}
          foundCount={nearby.isSuccess && !nearby.isPlaceholderData ? scanPlaces.length : null}
          isError={nearby.isError}
          onCancel={() => actions.goTo('vibe')}
          onRetry={() => void nearby.refetch()}
          onHeightChange={setSheetHeight}
        />
      )}

      {step === 'browse' && nearby.data && !selectedId && (
        <BrowsePanel
          places={nearby.data.places}
          activePlaceId={store.activePlaceId}
          sort={store.sort}
          vibeCount={vibes.length}
          visitWindow={store.visitWindow}
          scanRun={scanRun}
          onSort={actions.setSort}
          onVisitWindow={actions.setVisitWindow}
          onEditVibes={() => actions.goTo('vibe')}
          onActivate={actions.setActivePlace}
          onOpen={openPlace}
          onHeightChange={setSheetHeight}
          onAssist={() => setAssistOpen(true)}
        />
      )}

      {selectedId && (
        <PlaceDetailPanel
          detail={detail.data}
          isLoading={detail.isLoading}
          isError={detail.isError}
          canGoBack={canGoBack}
          onBack={() => void navigate(-1)}
          onClose={closeDetail}
          onRetry={() => void detail.refetch()}
          onOpenPlace={openPlace}
          onPlan={(placeId) => planTrip(placeId, 'plan')}
          onHeightChange={setDetailHeight}
        />
      )}

      {assistOpen && step === 'browse' && !selectedId && (
        <AssistSheet
          placeName={
            assistPlace ? (isId ? assistPlace.venue.nameId : assistPlace.venue.nameEn) : null
          }
          onChoose={(choice) => planTrip(assistPlace?.venue.id ?? null, choice)}
          onClose={() => setAssistOpen(false)}
        />
      )}
    </main>
  );
}
