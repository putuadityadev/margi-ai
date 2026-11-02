import { apiClient } from './apiClient';

export interface ProductEventData {
  name: string;
  props?: Record<string, unknown> | undefined;
  timestamp: number;
}

let eventQueue: ProductEventData[] = [];
let isFlushScheduled = false;

async function flushEvents(): Promise<void> {
  isFlushScheduled = false;
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  for (const event of eventsToSend) {
    try {
      await apiClient('/events', {
        method: 'POST',
        body: {
          name: event.name,
          props: event.props,
        },
      });
    } catch {
      // Fire-and-forget telemetry: never throws or crashes client
    }
  }
}

/**
 * Fires a product analytics event batched per animation frame.
 * Guaranteed never to throw an error.
 */
export function track(name: string, props?: Record<string, unknown>): void {
  eventQueue.push({
    name,
    props,
    timestamp: Date.now(),
  });

  if (!isFlushScheduled) {
    isFlushScheduled = true;
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        void flushEvents();
      });
    } else {
      queueMicrotask(() => {
        void flushEvents();
      });
    }
  }
}
