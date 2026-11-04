import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/** The page animates only when the visitor has not asked for reduced motion. */
export function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  );
}

let activeLenis: Lenis | null = null;

export function registerLenis(instance: Lenis | null): void {
  activeLenis = instance;
}

/** Smooth-scrolls to a section; falls back to the browser when smooth scrolling is off. */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  if (activeLenis) activeLenis.scrollTo(target, { offset: -72, duration: 1.4 });
  else target.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export { gsap, ScrollTrigger };
