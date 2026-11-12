/** Screens with their own guided tour (T-101). */
export type TourId = 'explore' | 'place' | 'trip' | 'chat';

export interface TourStep {
  /** CSS selector of the element to highlight; null for a centred note with no element. */
  readonly target: string | null;
  /** Key under the tour's namespace in `locales/{id,en}/tour.json` (title and body). */
  readonly copy: string;
}

const tag = (id: string): string => `[data-tour="${id}"]`;

/**
 * Steps per screen, in the order a first-time traveller meets the controls. Steps whose element
 * is not on screen (phone and desktop layouts differ) are skipped when the tour starts.
 */
export const TOURS: Readonly<Record<TourId, readonly TourStep[]>> = {
  explore: [
    { target: tag('vibes'), copy: 'explore.vibes' },
    { target: tag('visit-time'), copy: 'explore.visitTime' },
    { target: '[data-place-id]', copy: 'explore.card' },
    { target: tag('assist'), copy: 'explore.assist' },
    { target: tag('help'), copy: 'explore.help' },
  ],
  place: [
    { target: tag('crowd-chart'), copy: 'place.chart' },
    { target: tag('alternatives'), copy: 'place.alternatives' },
    { target: tag('etiquette'), copy: 'place.etiquette' },
    { target: tag('msmes'), copy: 'place.msmes' },
    { target: tag('plan-trip'), copy: 'place.plan' },
  ],
  trip: [
    { target: tag('depart'), copy: 'trip.depart' },
    { target: tag('depart-chart'), copy: 'trip.chart' },
    { target: tag('timeline'), copy: 'trip.timeline' },
    { target: tag('add-stop'), copy: 'trip.addStop' },
    { target: tag('copilot-tab'), copy: 'trip.copilot' },
    { target: tag('calendar'), copy: 'trip.calendar' },
    { target: tag('save'), copy: 'trip.save' },
  ],
  chat: [
    { target: tag('chat-starters'), copy: 'chat.starters' },
    { target: tag('chat-input'), copy: 'chat.input' },
    { target: null, copy: 'chat.cards' },
    { target: null, copy: 'chat.difference' },
  ],
};
