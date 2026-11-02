import { type ReactNode } from 'react';
import { HeroSection } from './HeroSection';
import { ProblemNumbersSection } from './ProblemNumbersSection';
import { HowAgentsWorkSection } from './HowAgentsWorkSection';
import { ImpactSection } from './ImpactSection';
import { ResponsibleAiSection } from './ResponsibleAiSection';
import { LandingCtaBanner } from './LandingCtaBanner';

export function LandingPage(): ReactNode {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <HeroSection />
      <ProblemNumbersSection />
      <HowAgentsWorkSection />
      <ImpactSection />
      <ResponsibleAiSection />
      <LandingCtaBanner />
    </div>
  );
}
