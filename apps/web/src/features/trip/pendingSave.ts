import type { TripSituation } from '@margi-ai/shared';
import type { TripDraft } from '../../stores/tripStore';

const KEY = 'margi_pending_save';

export interface PendingSave {
  readonly draft: TripDraft;
  readonly situation: TripSituation;
  readonly changeLog: readonly string[];
}

/**
 * Signing in with Google leaves the page, which wipes the in-memory plan. The plan is parked in
 * this tab's session storage just before the redirect and restored (and saved) on return.
 */
export function stashPendingSave(pending: PendingSave): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Without storage the traveller just taps Save again after signing in.
  }
}

export function peekPendingSave(): PendingSave | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingSave) : null;
  } catch {
    return null;
  }
}

export function clearPendingSave(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
