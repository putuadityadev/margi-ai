import { beforeEach, describe, expect, it } from 'vitest';
import { defaultVisitWindow, useExploreStore, visitInstant } from './exploreStore';

describe('exploreStore (D-025)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useExploreStore.getState().reset();
  });

  it('defaults to "now" by day and to the next morning at night (WITA)', () => {
    expect(defaultVisitWindow(new Date('2026-11-03T02:00:00Z'))).toBe('now'); // 10:00 WITA
    expect(defaultVisitWindow(new Date('2026-11-03T13:00:00Z'))).toBe('morning'); // 21:00 WITA
  });

  it('resolves visit windows to WITA instants', () => {
    const night = new Date('2026-11-03T13:00:00Z'); // 21:00 WITA
    expect(visitInstant('now', night)).toBeUndefined();
    expect(visitInstant('later', night)).toBe('2026-11-03T23:00:00.000+08:00');
    expect(visitInstant('morning', night)).toBe('2026-11-04T08:00:00.000+08:00');
    const dawn = new Date('2026-11-02T21:00:00Z'); // 05:00 WITA
    expect(visitInstant('morning', dawn)).toBe('2026-11-03T08:00:00.000+08:00');
  });

  it('walks the flow: intro → locate → vibe → scan → browse', () => {
    const store = useExploreStore.getState();
    expect(store.step).toBe('intro');
    store.finishIntro();
    expect(useExploreStore.getState().step).toBe('locate');
    expect(window.localStorage.getItem('margi_explore_onboarded')).toBe('1');

    useExploreStore.getState().confirmOrigin();
    expect(useExploreStore.getState().step).toBe('locate');

    useExploreStore.getState().setOrigin({ lat: -8.5, lng: 115.26 }, 'area');
    useExploreStore.getState().confirmOrigin();
    expect(useExploreStore.getState().step).toBe('vibe');

    useExploreStore.getState().toggleVibe('BEACH');
    useExploreStore.getState().toggleVibe('SUNSET');
    useExploreStore.getState().toggleVibe('BEACH');
    expect(useExploreStore.getState().vibes).toEqual(['SUNSET']);

    useExploreStore.getState().startScan();
    expect(useExploreStore.getState()).toMatchObject({ step: 'scan', scanRun: 1 });
    useExploreStore.getState().finishScan();
    expect(useExploreStore.getState().step).toBe('browse');
  });

  it('skips the intro for returning travellers', () => {
    window.localStorage.setItem('margi_explore_onboarded', '1');
    useExploreStore.getState().reset();
    expect(useExploreStore.getState().step).toBe('locate');
  });
});
