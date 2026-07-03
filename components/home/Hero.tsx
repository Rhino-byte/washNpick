import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { siteConfig } from "@/lib/site-config";
import { siteImages } from "@/lib/site-images";

export function Hero() {
  return (
    <section className="gradient-fade-hero overflow-hidden">
      <div className="px-4 pt-4">
        <ImageSlot
          image={siteImages.hero}
          aspect="wide"
          priority
          overlay
          className="ring-1 ring-white/10"
        />
      </div>
      <div className="px-4 pb-8 pt-5">
        <p className="text-sm font-medium text-accent-start">{siteConfig.heroEyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground">
          {siteConfig.tagline}
        </h1>
        <p className="mt-3 text-base text-muted">
          Book a pickup from your phone. We collect, clean, and deliver fresh laundry to your door.
        </p>
        <Link href="/order" className="mt-6 block">
          <Button variant="accent" size="lg" fullWidth>
            Schedule Pickup
          </Button>
        </Link>
        <p className="mt-3 text-center text-sm text-muted">
          From <span className="text-gradient font-semibold">KES 50/kg</span> &middot; Free pickup in{" "}
          {siteConfig.serviceArea}
        </p>
      </div>
    </section>
  );
}
