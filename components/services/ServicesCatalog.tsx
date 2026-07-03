"use client";

import Link from "next/link";
import { useServices } from "@/hooks/useServices";
import { getServiceImage } from "@/lib/site-images";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";

interface ServicesCatalogProps {
  variant: "highlights" | "full";
}

export function ServicesCatalog({ variant }: ServicesCatalogProps) {
  const { services } = useServices();

  if (variant === "highlights") {
    return (
      <section className="px-4 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Our services</h2>
          <Link
            href="/services"
            className="flex items-center gap-1 text-sm font-medium text-accent-start"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {services.map((service) => {
            const image = service.imageKey
              ? getServiceImage(service.id)
              : undefined;
            return (
              <Link
                key={service.id}
                href={`/order?service=${service.id}`}
                className="glass-card overflow-hidden rounded-2xl transition-colors active:bg-surface-elevated"
              >
                {image && (
                  <ImageSlot
                    image={image}
                    aspect="video"
                    rounded="none"
                    className="rounded-t-2xl"
                  />
                )}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <p className="mt-0.5 text-sm text-accent-start">{service.priceLabel}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {services.map((service) => {
        const image = service.imageKey ? getServiceImage(service.id) : undefined;
        return (
          <div key={service.id} className="glass-card overflow-hidden rounded-2xl">
            {image && <ImageSlot image={image} aspect="video" rounded="none" />}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-foreground">{service.name}</h2>
                <span className="rounded-lg border border-accent-start/30 bg-accent-start/10 px-2.5 py-1 text-sm font-semibold text-accent-start">
                  {service.priceLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{service.description}</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                Turnaround: {service.turnaround}
              </div>
              <Link href={`/order?service=${service.id}`} className="mt-4 block">
                <Button variant="outline" size="md" fullWidth>
                  Add to order
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
