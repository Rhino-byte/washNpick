"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { apiOrderToStored } from "@/lib/order-storage";
import type { StoredOrder } from "@/lib/order-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/track/StatusTimeline";
import { OrderSummary } from "@/components/order/OrderSummary";
import { WhatsAppPlaceholder } from "@/components/WhatsAppPlaceholder";
import { Search, AlertCircle } from "lucide-react";

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref")?.toUpperCase() ?? "";
  const [orderRef, setOrderRef] = useState(initialRef);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setError("");
    setLoading(true);

    if (!orderRef.trim()) {
      setError("Enter your order reference");
      setOrder(null);
      setLoading(false);
      return;
    }
    if (phoneLast4.replace(/\D/g, "").length !== 4) {
      setError("Enter the last 4 digits of your phone number");
      setOrder(null);
      setLoading(false);
      return;
    }

    try {
      const result = await api.trackOrder(orderRef.trim(), phoneLast4);
      setOrder(apiOrderToStored(result));
    } catch (err) {
      setOrder(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Order not found. Check your reference and phone digits.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-foreground">Track your order</h1>
      <p className="mt-1 text-sm text-muted">
        Enter your order reference and phone number to check status.
      </p>

      <form onSubmit={handleSearch} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="orderRef" required>
            Order reference
          </Label>
          <Input
            id="orderRef"
            placeholder="WP-20260627-A3K9"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label htmlFor="phoneLast4" required>
            Last 4 digits of phone
          </Label>
          <Input
            id="phoneLast4"
            type="tel"
            inputMode="numeric"
            maxLength={4}
            placeholder="5678"
            value={phoneLast4}
            onChange={(e) =>
              setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Track order"}
        </Button>
      </form>

      {error && searched && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {order && (
        <div className="mt-6 space-y-4">
          <StatusTimeline order={order} />
          <OrderSummary data={order} showDisclaimer={false} estimatedTotal={order.estimatedTotal} />
          <div className="glass-card rounded-xl p-4 text-center text-sm text-muted">
            Order updates are sent automatically via WhatsApp
          </div>
          <WhatsAppPlaceholder orderRef={order.id} variant="button" />
        </div>
      )}
    </div>
  );
}

export function TrackPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-start border-t-transparent" />
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
