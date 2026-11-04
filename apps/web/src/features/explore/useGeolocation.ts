import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@margi-ai/shared';

export type GeolocationStatus = 'idle' | 'locating' | 'denied' | 'unavailable';

const GPS_TIMEOUT_MS = 10_000;
const GPS_MAX_AGE_MS = 60_000;

/**
 * One-shot browser geolocation. The position is handed to the caller and never stored
 * (product invariant: GPS coordinates are not persisted).
 */
export function useGeolocation(onLocated: (point: GeoPoint) => void) {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const latestCallback = useRef(onLocated);
  useEffect(() => {
    latestCallback.current = onLocated;
  });

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('idle');
        latestCallback.current({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS },
    );
  }, []);

  return { status, request };
}
