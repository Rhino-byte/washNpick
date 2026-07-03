import { trustItems } from "@/lib/mock-data";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/site-config";

export function TrustStrip() {
  return (
    <section className="gradient-border-card mx-4 rounded-2xl p-4">
      <h2 className="text-lg font-bold text-foreground">{siteConfig.trustHeading}</h2>
      <ul className="mt-3 space-y-2">
        {trustItems.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-foreground/90">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-start" />
            <span>{item}</span>
            {item.includes("WhatsApp") && (
              <Badge variant="muted" className="ml-auto">
                Soon
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
