"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import type { StoredOrder } from "@/lib/order-types";
import { ORDER_STATUS_LABELS } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderSummary } from "./OrderSummary";
import { WhatsAppPlaceholder } from "@/components/WhatsAppPlaceholder";

interface OrderConfirmationProps {
  order: StoredOrder;
}

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const copyRef = async () => {
    await navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-6 pb-24">
      <div className="text-center">
        <div className="gradient-cta mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Order placed!</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll confirm your pickup shortly.
        </p>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-4">
        <p className="text-sm text-muted">Order reference</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xl font-bold tracking-wide text-gradient">
            {order.id}
          </span>
          <button
            type="button"
            onClick={copyRef}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-accent-start hover:bg-surface"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-3">
          <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>
      </div>

      <div className="mt-4">
        <OrderSummary data={order} />
      </div>

      <div className="mt-6 space-y-3">
        <WhatsAppPlaceholder orderRef={order.id} variant="button" />
        <Link href={`/track?ref=${order.id}`}>
          <Button variant="outline" size="lg" fullWidth>
            Track order
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="md" fullWidth>
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
