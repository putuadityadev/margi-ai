import type { TourId } from './tours';

const STORAGE_KEY = 'margi_tour';

interface TourMemory {
  /** The traveller chose "Skip": no tour starts on its own again. */
  readonly declined: boolean;
  readonly seen: readonly TourId[];
}

const EMPTY: TourMemory = { declined: false, seen: [] };

function read(): TourMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<TourMemory>;
    return {
      declined: parsed.declined === true,
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
    };
  } catch {
    // Blocked or corrupt storage only means the tour is offered again.
    return EMPTY;
  }
}

function write(memory: TourMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Same as above: nothing is lost but the reminder.
  }
}

/** True when the tour should start by itself on this screen. */
export function shouldAutoStart(id: TourId): boolean {
  const memory = read();
  return !memory.declined && !memory.seen.includes(id);
}

/** True once the traveller answered the first offer (took the tour or skipped it). */
export function wasOffered(): boolean {
  const memory = read();
  return memory.declined || memory.seen.includes('start');
}

export function markSeen(id: TourId): void {
  const memory = read();
  if (!memory.seen.includes(id)) write({ ...memory, seen: [...memory.seen, id] });
}

export function declineTours(): void {
  write({ ...read(), declined: true });
}
