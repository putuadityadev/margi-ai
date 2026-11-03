import { getCrowdColor } from './crowdScale';

/** Visual state of a place pin on the explore map. */
export type PinState = 'idle' | 'active' | 'target' | 'alternative' | 'muted';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Leaflet divIcons take raw HTML, so every API-provided string must be escaped first. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export interface PlacePinOptions {
  readonly busynessPct: number;
  readonly name: string;
  readonly state: PinState;
  readonly isMsme: boolean;
  readonly isOpen: boolean;
  /**
   * Delay before the pop-in animation, so pins appear as the radar ring passes them.
   * Null renders the pin statically (after the scan), so state changes never replay the pop.
   */
  readonly revealDelayMs: number | null;
}

/**
 * HTML for a place pin: a crowd-coloured square, the busyness value, and the
 * place name when the pin is focused. Styled by the `.mp-*` rules in styles/index.css.
 */
export function placePinHtml(options: PlacePinOptions): string {
  const { busynessPct, name, state, isMsme, isOpen, revealDelayMs } = options;
  const color = isOpen ? getCrowdColor(busynessPct) : 'var(--color-stone)';
  const value = isOpen ? `${Math.round(busynessPct)}%` : '–';
  const showName = state === 'active' || state === 'target' || state === 'alternative';
  const classes = [
    'mp-pin',
    `mp-pin--${state}`,
    isMsme ? 'mp-pin--msme' : '',
    revealDelayMs === null ? '' : 'mp-pin--reveal',
  ].join(' ');

  return `<div class="${classes}" style="--mp-delay:${revealDelayMs ?? 0}ms">
    <span class="mp-body"><span class="mp-dot" style="background:${color}"></span><span class="mp-val">${value}</span>${
      showName ? `<span class="mp-name">${escapeHtml(name)}</span>` : ''
    }</span><span class="mp-tick"></span>
  </div>`;
}

/** HTML for the traveller marker; `scanning` adds the radar rings and sweep. */
export function userPinHtml(scanning: boolean): string {
  const radar = scanning
    ? `<span class="mp-ring"></span><span class="mp-ring mp-ring--2"></span><span class="mp-ring mp-ring--3"></span>
       <svg class="mp-sweep" viewBox="-100 -100 200 200" aria-hidden="true"><path d="M0 0 L0 -100 A100 100 0 0 1 50 -86.6 Z" /><line x1="0" y1="0" x2="50" y2="-86.6" /></svg>`
    : '<span class="mp-halo"></span>';
  return `<div class="mp-user${scanning ? ' mp-user--scanning' : ''}">${radar}<span class="mp-user-core"></span></div>`;
}

export interface StopPinOptions {
  /** 1-based position in the itinerary. */
  readonly order: number;
  readonly busynessPct: number;
  readonly name: string;
  readonly isRedZone: boolean;
  readonly isOpen: boolean;
  readonly isMsme: boolean;
}

/** Numbered itinerary pin: order, crowd colour at arrival, value, and name. */
export function stopPinHtml(options: StopPinOptions): string {
  const { order, busynessPct, name, isRedZone, isOpen, isMsme } = options;
  const color = isOpen ? getCrowdColor(busynessPct) : 'var(--color-stone)';
  const value = isOpen ? `${Math.round(busynessPct)}%` : '–';
  const classes = [
    'mp-pin',
    'mp-pin--stop',
    isRedZone ? 'mp-pin--red' : '',
    isMsme ? 'mp-pin--msme' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="${classes}">
    <span class="mp-body"><span class="mp-order">${order}</span><span class="mp-dot" style="background:${color}"></span><span class="mp-val">${value}</span><span class="mp-name">${escapeHtml(name)}</span></span><span class="mp-tick"></span>
  </div>`;
}

/** Ghost pin for a place a suggestion would introduce, shown while its card is focused. */
export function previewPinHtml(name: string): string {
  return `<div class="mp-pin mp-pin--alternative mp-pin--reveal" style="--mp-delay:0ms">
    <span class="mp-body"><span class="mp-name">${escapeHtml(name)}</span></span><span class="mp-tick"></span>
  </div>`;
}

/** Small moving marker used to play the route back. */
export function travellerHtml(): string {
  return '<div class="mp-traveller"></div>';
}
