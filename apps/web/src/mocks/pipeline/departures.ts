import {
  toWita,
  type DepartureOption,
  type DepartureScan,
  type TripRequest,
} from '@margi-ai/shared';
import { evaluateTrip, roadMinutesOf, type TripContext } from './trip';

/** Day window scanned for departures, WITA hours; most attractions open 06:00–18:00. */
export const DEPARTURE_DAY_WINDOW = Object.freeze({ firstHour: 6, lastHour: 18, stepMinutes: 30 });

/**
 * Evaluates the same trip at every departure slot of its WITA day, so the client can chart
 * crowd on arrival against departure time. Best = lowest crowd with no closed stop, then
 * fewer road minutes.
 */
export function scanDepartures(request: TripRequest, ctx: TripContext): DepartureScan {
  const day = toWita(request.departAt).set({ second: 0, millisecond: 0 });
  const { firstHour, lastHour, stepMinutes } = DEPARTURE_DAY_WINDOW;
  const options: DepartureOption[] = [];
  for (let minutes = firstHour * 60; minutes <= lastHour * 60; minutes += stepMinutes) {
    const departAt =
      day.set({ hour: Math.floor(minutes / 60), minute: minutes % 60 }).toISO() ?? request.departAt;
    const { metrics, stops } = evaluateTrip({ ...request, departAt }, ctx);
    options.push({
      departAt,
      crowdExposure: metrics.crowdExposure,
      roadMinutes: roadMinutesOf(metrics),
      closedStops: stops.filter((stop) => !stop.place.isOpenNow).length,
      redZoneStops: metrics.redZoneStops,
    });
  }
  let bestIndex = -1;
  options.forEach((option, index) => {
    if (option.closedStops > 0) return;
    const best = options[bestIndex];
    if (
      !best ||
      option.crowdExposure < best.crowdExposure ||
      (option.crowdExposure === best.crowdExposure && option.roadMinutes < best.roadMinutes)
    ) {
      bestIndex = index;
    }
  });
  return { options, bestIndex };
}
