import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_TRIP_STOPS, type NearbyPlace } from '@margi-ai/shared';
import { useChatStore } from './chatStore';

function place(index: number): NearbyPlace {
  return {
    venue: { id: `id-${index}`, nameEn: `Place ${index}`, nameId: `Tempat ${index}` },
  } as unknown as NearbyPlace;
}

describe('chatStore tray', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useChatStore.getState().reset();
  });

  it('adds and removes a place with the same toggle', () => {
    expect(useChatStore.getState().toggleTray(place(1))).toBe(true);
    expect(useChatStore.getState().tray).toHaveLength(1);
    expect(useChatStore.getState().toggleTray(place(1))).toBe(true);
    expect(useChatStore.getState().tray).toHaveLength(0);
  });

  it('refuses a stop beyond the trip limit', () => {
    for (let index = 0; index < MAX_TRIP_STOPS; index += 1)
      useChatStore.getState().toggleTray(place(index));
    expect(useChatStore.getState().toggleTray(place(99))).toBe(false);
    expect(useChatStore.getState().tray).toHaveLength(MAX_TRIP_STOPS);
  });

  it('keeps the tray when the conversation is trimmed and drops errors on request', () => {
    const store = useChatStore.getState();
    store.addUser('hi');
    store.addError('generic', 'hi');
    expect(useChatStore.getState().messages).toHaveLength(2);
    useChatStore.getState().dropErrors();
    expect(useChatStore.getState().messages).toHaveLength(1);
  });
});
