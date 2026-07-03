"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ApiOrder } from "@/lib/api";
import { apiOrderToStored } from "@/lib/order-storage";
import {
  getNextOrderStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-types";
import { StatusTimeline } from "@/components/track/StatusTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

function formatStatusLabel(status: string): string {
  if (status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface StaffOrderDetailProps {
  order: ApiOrder | null;
  loading: boolean;
  onAdvance: (status: string, note?: string) => Promise<void>;
  advancing: boolean;
  error: string;
}

export function StaffOrderDetail({
  order,
  loading,
  onAdvance,
  advancing,
  error,
}: StaffOrderDetailProps) {
  const [note, setNote] = useState("");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <DottedSpinner size="md" />
      </div>
    );
  }

  if (!order) {
    return (
      <p className="py-12 text-center text-sm text-muted">Select an order to view details.</p>
    );
  }

  const stored = apiOrderToStored(order);
  const nextStatus = getNextOrderStatus(order.status);
  const pickup = order.addresses.find((a) => a.type === "pickup");
  const delivery = order.addresses.find((a) => a.type === "delivery");

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <p className="font-mono text-lg font-bold text-foreground">{order.id}</p>
        <p className="mt-1 text-sm text-muted">
          Current: <span className="text-foreground">{formatStatusLabel(order.status)}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Estimated total: KES {order.estimated_total.toLocaleString()}
        </p>
      </div>

      <StatusTimeline order={stored} />

      {pickup && (
        <div className="glass-card rounded-2xl p-4 text-sm">
          <h3 className="font-semibold text-foreground">Pickup</h3>
          <p className="mt-1 text-muted">{pickup.formatted_address ?? pickup.area}</p>
          {pickup.address_line && <p className="text-muted">{pickup.address_line}</p>}
        </div>
      )}

      {delivery && !order.same_delivery_address && (
        <div className="glass-card rounded-2xl p-4 text-sm">
          <h3 className="font-semibold text-foreground">Delivery</h3>
          <p className="mt-1 text-muted">{delivery.formatted_address ?? delivery.area}</p>
        </div>
      )}

      {order.status_history.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold text-foreground">History</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {[...order.status_history]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )
              .map((entry) => (
                <li key={`${entry.status}-${entry.created_at}`} className="border-b border-border pb-2 last:border-0">
                  <p className="font-medium text-foreground">{formatStatusLabel(entry.status)}</p>
                  <p className="text-xs text-muted">
                    {new Date(entry.created_at).toLocaleString("en-KE")}
                  </p>
                  {entry.note && <p className="text-xs text-muted">{entry.note}</p>}
                </li>
              ))}
          </ul>
        </div>
      )}

      {nextStatus && (
        <div className="glass-card rounded-2xl p-4">
          <Label htmlFor="status-note">Note (optional)</Label>
          <Input
            id="status-note"
            className="mt-2"
            placeholder="e.g. Picked up at gate"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="mt-4"
            loading={advancing}
            loadingText="Updating"
            onClick={() => void onAdvance(nextStatus, note.trim() || undefined)}
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!nextStatus && order.status === "delivered" && (
        <p className="text-center text-sm text-emerald-400">Order delivered.</p>
      )}
    </div>
  );
}
