import type { Metadata } from "next";
import Link from "next/link";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { siteConfig, formatPhoneTel } from "@/lib/site-config";
import { siteImages } from "@/lib/site-images";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about WashnPick laundry pickup and delivery in Ololulunga.",
};

export default function AboutPage() {
  return (
    <MobileLayout>
      <div className="pb-24">
        <div className="px-4 pt-4">
          <ImageSlot image={siteImages.aboutHero} aspect="wide" />
        </div>

        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">About us</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {siteConfig.businessName} is an Ololulunga-based laundry service built for busy
            professionals and families. We pick up your laundry from your doorstep,
            clean it with care, and deliver it back fresh and folded.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Our goal is simple: make laundry effortless. Book online in minutes, track
            your order, and soon get real-time updates on WhatsApp.
          </p>

          <div className="mt-8 space-y-4">
            <div className="glass-card flex items-start gap-3 rounded-2xl p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-start" />
              <div>
                <p className="font-medium text-foreground">Service area</p>
                <p className="mt-1 text-sm text-muted">
                  {siteConfig.serviceArea}, Kenya
                </p>
                <p className="mt-0.5 text-xs text-muted/70">{siteConfig.address}</p>
              </div>
            </div>

            <div className="glass-card flex items-start gap-3 rounded-2xl p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent-start" />
              <div>
                <p className="font-medium text-foreground">Operating hours</p>
                <p className="mt-1 text-sm text-muted">{siteConfig.hours}</p>
              </div>
            </div>

            <div className="glass-card flex items-start gap-3 rounded-2xl p-4">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent-start" />
              <div>
                <p className="font-medium text-foreground">Phone</p>
                <a
                  href={`tel:${formatPhoneTel(siteConfig.phone)}`}
                  className="mt-1 block text-sm text-accent-start hover:underline"
                >
                  {siteConfig.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="glass-card flex items-start gap-3 rounded-2xl p-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent-start" />
              <div>
                <p className="font-medium text-foreground">Email</p>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="mt-1 block text-sm text-accent-start hover:underline"
                >
                  {siteConfig.email}
                </a>
              </div>
            </div>
          </div>

          <Link href="/order" className="mt-8 block">
            <Button variant="accent" size="lg" fullWidth>
              Schedule your first pickup
            </Button>
          </Link>
        </div>
      </div>
    </MobileLayout>
  );
}
