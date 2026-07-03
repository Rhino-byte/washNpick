import { MobileLayout } from "@/components/layout/MobileLayout";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ServiceHighlights } from "@/components/home/ServiceHighlights";
import { TrustStrip } from "@/components/home/TrustStrip";
import { PricingTeaser } from "@/components/home/PricingTeaser";

export default function HomePage() {
  return (
    <MobileLayout>
      <Hero />
      <HowItWorks />
      <ServiceHighlights />
      <div className="py-4">
        <TrustStrip />
      </div>
      <PricingTeaser />
    </MobileLayout>
  );
}
