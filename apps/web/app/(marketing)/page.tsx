import { BusinessChoiceSection } from "@/components/marketing/BusinessChoiceSection";
import { DetailSection } from "@/components/marketing/DetailSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { Footer } from "@/components/marketing/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { StatsSection } from "@/components/marketing/StatsSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";

export default function MarketingHomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background scroll-smooth">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[160px]" />
        <div className="absolute top-1/3 right-0 h-[500px] w-[500px] rounded-full bg-[hsl(var(--glow-violet))]/[0.05] blur-[160px]" />
      </div>
      <MarketingNavbar />
      <HeroSection />
      <StatsSection />
      <BusinessChoiceSection />
      <FeaturesSection />
      <DetailSection />
      <PricingSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
