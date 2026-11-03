import { type ReactNode } from 'react';
import { HeroSection } from './HeroSection';

export function LandingPage(): ReactNode {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <HeroSection />
    </div>
  );
}
