import type { Metadata } from "next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { ServicesCatalog } from "@/components/services/ServicesCatalog";
import { siteImages } from "@/lib/site-images";
import { ImageSlot } from "@/components/ui/ImageSlot";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Wash & fold, duvet, and double bed laundry in Ololulunga with transparent KES pricing.",
};

export default function ServicesPage() {
  return (
    <MobileLayout>
      <div className="pb-6">
        <div className="px-4 pt-4">
          <ImageSlot image={siteImages.servicesBanner} aspect="wide" />
        </div>

        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">Our services</h1>
          <p className="mt-2 text-sm text-muted">
            Professional laundry care with transparent KES pricing.
          </p>

          <ServicesCatalog variant="full" />
        </div>
      </div>
    </MobileLayout>
  );
}
