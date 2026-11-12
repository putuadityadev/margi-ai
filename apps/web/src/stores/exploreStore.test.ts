import { beforeEach, describe, expect, it } from 'vitest';
import { pickableHours } from '../features/explore/BrowsePanel';
import { chosenVisit, defaultVisitWindow, useExploreStore, visitInstant } from './exploreStore';

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

  it('resolves a chosen hour on the WITA day, also when UTC is still on the previous date', () => {
    const lateUtc = new Date('2026-11-03T17:30:00Z'); // 01:30 WITA on 4 November
    expect(visitInstant('today@16', lateUtc)).toBe('2026-11-04T16:00:00.000+08:00');
    expect(visitInstant('tomorrow@7', lateUtc)).toBe('2026-11-05T07:00:00.000+08:00');
    expect(chosenVisit('tomorrow@16')).toEqual({ day: 'tomorrow', hour: 16 });
    expect(chosenVisit('morning')).toBeNull();
  });

  it('lists only the hours still ahead today', () => {
    const afternoon = new Date('2026-11-03T07:30:00Z'); // 15:30 WITA
    const hours = pickableHours(afternoon);
    expect(hours.today[0]).toBe(16);
    expect(hours.tomorrow).toHaveLength(18);
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
