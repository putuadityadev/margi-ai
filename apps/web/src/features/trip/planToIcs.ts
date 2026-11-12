import { googleMapsDirUrl, type TripPlan, type TripStop } from '@margi-ai/shared';

export interface IcsOptions {
  /** Event text for one stop, already in the traveller's language. */
  readonly describe: (stop: TripStop, index: number) => string;
  readonly name: (stop: TripStop) => string;
  /** Creation time of the file (DTSTAMP). */
  readonly now: Date;
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped in text values. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** UTC form "20261114T010000Z", so no timezone definition is needed in the file. */
function utcStamp(instant: string | Date): string {
  const iso = (typeof instant === 'string' ? new Date(instant) : instant).toISOString();
  return `${iso.slice(0, 19).replace(/[-:]/g, '')}Z`;
}

const MAX_LINE_OCTETS = 75;

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/**
 * A calendar file with one event per stop of the plan, from its computed arrival to its
 * departure. Every figure comes from the plan itself.
 */
export function planToIcs(plan: TripPlan, options: IcsOptions): string {
  const stamp = utcStamp(options.now);
  const events = plan.stops.flatMap((stop, index) => {
    const { venue } = stop.place;
    const name = options.name(stop);
    return [
      'BEGIN:VEVENT',
      `UID:${utcStamp(plan.request.departAt)}-${index}-${venue.id}@margi.web.id`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcStamp(stop.arriveAt)}`,
      `DTEND:${utcStamp(stop.leaveAt)}`,
      `SUMMARY:${escapeText(name)}`,
      `LOCATION:${escapeText(name)}`,
      `GEO:${venue.lat.toFixed(6)};${venue.lng.toFixed(6)}`,
      `DESCRIPTION:${escapeText(options.describe(stop, index))}`,
      `URL:${googleMapsDirUrl(venue)}`,
      'END:VEVENT',
    ];
  });
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MARGI AI//Trip plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
