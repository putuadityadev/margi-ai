import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { cn } from './cn';
import { gsap, ScrollTrigger, SplitText, useReducedMotion } from './gsap';

describe('lib/cn', () => {
  it('combines classes cleanly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('merges tailwind conflict classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-ink', 'text-graphite')).toBe('text-graphite');
  });

  it('handles conditional falsy inputs', () => {
    const isHidden = false;
    expect(cn('flex', isHidden && 'hidden', null, undefined)).toBe('flex');
  });
});

describe('lib/gsap', () => {
  it('exports registered GSAP plugins', () => {
    expect(gsap).toBeDefined();
    expect(ScrollTrigger).toBeDefined();
    expect(SplitText).toBeDefined();
  });

  it('returns reduced motion status via useReducedMotion hook', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(typeof result.current).toBe('boolean');
  });
});
