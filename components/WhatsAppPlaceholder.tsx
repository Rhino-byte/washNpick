"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WhatsAppPlaceholderProps {
  orderRef?: string;
  variant?: "button" | "inline" | "icon";
  className?: string;
}

export function WhatsAppPlaceholder({
  orderRef,
  variant = "button",
  className,
}: WhatsAppPlaceholderProps) {
  const enabled = siteConfig.whatsappEnabled && siteConfig.whatsappNumber;

  if (enabled) {
    const text = orderRef
      ? encodeURIComponent(`Hi, I'd like updates on order ${orderRef}`)
      : encodeURIComponent("Hi, I'd like to schedule a laundry pickup.");
    const href = `https://wa.me/${siteConfig.whatsappNumber}?text=${text}`;

    if (variant === "icon") {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-green-400 transition-colors hover:bg-surface-elevated active:bg-white/10",
            className,
          )}
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
        </a>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          variant === "button"
            ? "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-base font-medium text-white transition-colors hover:bg-green-500"
            : "inline-flex items-center gap-2 text-sm text-green-400 hover:underline",
          className,
        )}
      >
        <MessageCircle className="h-5 w-5" />
        {orderRef ? "Get updates on WhatsApp" : "Chat on WhatsApp"}
      </a>
    );
  }

  if (variant === "icon") {
    return null;
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <MessageCircle className="h-4 w-4 text-muted" />
        <span className="text-sm text-muted">WhatsApp updates</span>
        <Badge variant="muted">Coming soon</Badge>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled
        title="WhatsApp integration coming soon"
        className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface text-base font-medium text-muted"
      >
        <MessageCircle className="h-5 w-5" />
        Get updates on WhatsApp
      </button>
      <Badge variant="muted" className="absolute -top-2 right-2">
        Coming soon
      </Badge>
    </div>
  );
}
