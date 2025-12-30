import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      
      <footer className="py-8 text-center text-muted-foreground text-sm bg-muted/30 border-t border-border">
        <div className="flex justify-center gap-6 mb-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
        © {new Date().getFullYear()} Family Tree. All rights reserved.
      </footer>
    </main>
  );
}
