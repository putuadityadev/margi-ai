import type { ReactNode } from 'react';
import { FactsSection } from './FactsSection';
import { FinalCtaSection } from './FinalCtaSection';
import { HeroSection } from './HeroSection';
import { LandingHeader } from './LandingHeader';
import { StepsSection } from './StepsSection';

/** `/`: marketing landing; every CTA leads into the explore flow at `/app`. */
export function LandingPage(): ReactNode {
  return (
    <div className="bg-white text-ink">
      <LandingHeader />
      <main id="main-content">
        <HeroSection />
        <StepsSection />
        <FactsSection />
        <FinalCtaSection />
      </main>
    </div>
  );
}
