import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '../../lib/i18n';
import { markSeen, shouldAutoStart, wasOffered } from './tourMemory';
import { TourOffer } from './TourOffer';

vi.mock('./runTour', () => ({ runTour: vi.fn(() => true) }));
const { runTour } = await import('./runTour');

describe('tour memory', () => {
  beforeEach(() => localStorage.clear());

  it('starts each screen tour once', () => {
    expect(shouldAutoStart('trip')).toBe(true);
    markSeen('trip');
    expect(shouldAutoStart('trip')).toBe(false);
    expect(shouldAutoStart('chat')).toBe(true);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('margi_tour', '{not json');
    expect(shouldAutoStart('explore')).toBe(true);
  });
});

describe('TourOffer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(runTour).mockClear();
  });

  it('skipping turns every automatic tour off', () => {
    render(<TourOffer />);
    fireEvent.click(screen.getByRole('button', { name: /lewati|skip/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(wasOffered()).toBe(true);
    expect(shouldAutoStart('trip')).toBe(false);
    expect(runTour).not.toHaveBeenCalled();
  });

  it('starts the first tour and is not offered again', () => {
    const { unmount } = render(<TourOffer />);
    fireEvent.click(screen.getByRole('button', { name: /tur singkat|short tour/i }));
    expect(runTour).toHaveBeenCalledWith('start');
    unmount();
    markSeen('start');
    render(<TourOffer />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
