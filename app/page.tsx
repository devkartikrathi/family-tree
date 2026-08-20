import { Capabilities } from '@/components/landing/capabilities';
import { Closing } from '@/components/landing/closing';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { SiteFooter } from '@/components/landing/site-footer';
import { SiteHeader } from '@/components/landing/site-header';
import { Trust } from '@/components/landing/trust';

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Capabilities />
        <Trust />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
