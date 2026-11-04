import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, NearbyPlace } from '@margi-ai/shared';
import { Dialog } from '../../components/ui/Dialog';
import { ApiClientError } from '../../lib/apiClient';
import { usePinPlace } from './queries';

const TILE_URL: string =
  import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BALI_CENTER: L.LatLngTuple = [-8.42, 115.18];
const PIN_ICON = L.divIcon({
  className: 'mp-icon',
  iconSize: [0, 0],
  html: '<span style="display:block;width:18px;height:18px;margin:-9px 0 0 -9px;background:#16181d;border:3px solid #d6f25c"></span>',
});

function Picker({ onPick }: { readonly onPick: (point: GeoPoint) => void }): null {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export interface PinPlaceDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** What the traveller typed; becomes the place name. */
  readonly initialName: string;
  readonly origin: GeoPoint | null;
  readonly onPinned: (place: NearbyPlace) => void;
}

/** Lets the traveller mark a place on the map when no search service knows it. */
export function PinPlaceDialog(props: PinPlaceDialogProps): ReactNode {
  const { t } = useTranslation('app');
  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('pin.title')}
      description={t('pin.hint')}
    >
      {props.isOpen && <PinForm key={props.initialName} {...props} />}
    </Dialog>
  );
}

function PinForm({
  isOpen,
  onClose,
  initialName,
  origin,
  onPinned,
}: PinPlaceDialogProps): ReactNode {
  const { t } = useTranslation('app');
  const pin = usePinPlace();
  const [name, setName] = useState(initialName);
  const [point, setPoint] = useState<GeoPoint | null>(null);

  const save = (): void => {
    if (!point || name.trim().length < 2) return;
    pin.mutate(
      { name: name.trim(), lat: point.lat, lng: point.lng, ...(origin ? { origin } : {}) },
      {
        onSuccess: ({ place }) => {
          onPinned(place);
          onClose();
        },
      },
    );
  };

  const outside = pin.error instanceof ApiClientError && pin.error.code === 'VALIDATION_FAILED';
  const failed = pin.isError && !outside;

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-body-sm text-ink">{t('pin.name')}</span>
        <input
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-full border border-ink bg-white px-3 text-body text-ink"
        />
      </label>
      <div className="h-64 w-full border border-ink">
        {isOpen && (
          <MapContainer
            center={origin ? [origin.lat, origin.lng] : BALI_CENTER}
            zoom={origin ? 12 : 9}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer url={TILE_URL} maxZoom={19} />
            <Picker onPick={setPoint} />
            {point && <Marker position={[point.lat, point.lng]} icon={PIN_ICON} />}
          </MapContainer>
        )}
      </div>
      <p role="status" className="text-body-sm text-graphite">
        {point ? t('pin.picked') : t('pin.tap')}
      </p>
      {outside && (
        <p role="alert" className="text-body-sm text-ink">
          {t('pin.outside')}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-body-sm text-ink">
          {t('pin.error')}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 border border-ink bg-white px-4 text-body-sm text-ink"
        >
          {t('pin.cancel')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!point || name.trim().length < 2 || pin.isPending}
          className="h-11 border border-ink bg-lime px-4 text-body-sm font-medium text-ink disabled:opacity-40"
        >
          {pin.isPending ? t('pin.saving') : t('pin.save')}
        </button>
      </div>
    </div>
  );
}
