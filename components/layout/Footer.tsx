import { Phone } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { siteConfig, formatPhoneTel } from "@/lib/site-config";
import { WhatsAppPlaceholder } from "@/components/WhatsAppPlaceholder";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 pb-20">
      <div className="space-y-4">
        <div>
          <BrandLogo height={44} className="mb-3" />
          <p className="font-semibold text-foreground">{siteConfig.businessName}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.serviceArea}, Kenya</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <a
            href={`tel:${formatPhoneTel(siteConfig.phone)}`}
            className="inline-flex items-center gap-2 text-accent-start hover:underline"
          >
            <Phone className="h-4 w-4" />
            {siteConfig.phoneDisplay}
          </a>
          <p className="text-muted">{siteConfig.hours}</p>
        </div>
        <WhatsAppPlaceholder variant="inline" />
        <a href="/about" className="text-sm text-accent-start hover:underline">
          About us
        </a>
        <p className="text-xs text-muted/70">
          &copy; {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
