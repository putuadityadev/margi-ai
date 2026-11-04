import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { Benefits } from './Benefits';
import { FinalCta } from './FinalCta';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingHeader } from './LandingHeader';
import { Numbers } from './Numbers';
import { Showcase } from './Showcase';
import { Trust } from './Trust';
import { gsap, motionAllowed, registerLenis, ScrollTrigger } from './motion';

/**
 * `/`: the marketing landing. Smooth (inertial) scrolling is driven by Lenis and shares one
 * ticker with GSAP ScrollTrigger so scrubbed animations stay in step with the scroll position.
 * Every CTA leads into the app at `/app`.
 */
export function LandingPage(): ReactNode {
  useEffect(() => {
    if (!motionAllowed()) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    registerLenis(lenis);
    lenis.on('scroll', () => ScrollTrigger.update());
    const tick = (time: number): void => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      registerLenis(null);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="bg-white text-ink">
      <LandingHeader />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <Benefits />
        <Showcase />
        <Numbers />
        <Trust />
        <FinalCta />
      </main>
    </div>
  );
}
