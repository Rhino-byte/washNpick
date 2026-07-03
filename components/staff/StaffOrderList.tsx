"use client";

import type { ApiStaffOrderListItem } from "@/lib/api";
import { formatDisplayDate } from "@/lib/order-storage";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function formatStatusLabel(status: string): string {
  if (status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function customerName(order: ApiStaffOrderListItem): string {
  const parts = [order.customer_first_name, order.customer_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Customer";
}

interface StaffOrderListProps {
  orders: ApiStaffOrderListItem[];
  selectedId: string | null;
  onSelect: (orderId: string) => void;
  loading?: boolean;
}

export function StaffOrderList({
  orders,
  selectedId,
  onSelect,
  loading,
}: StaffOrderListProps) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No orders match this filter.</p>;
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id}>
          <button
            type="button"
            onClick={() => onSelect(order.id)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-colors",
              selectedId === order.id
                ? "border-accent-start bg-accent-start/10"
                : "border-border bg-surface hover:bg-surface-elevated",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">{order.id}</p>
                <p className="mt-0.5 text-sm text-foreground/90">{customerName(order)}</p>
                {order.customer_phone && (
                  <p className="text-xs text-muted">{order.customer_phone}</p>
                )}
              </div>
              <Badge variant="accent" className="shrink-0 text-[10px]">
                {formatStatusLabel(order.status)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
              {order.pickup_date && (
                <span>Pickup: {formatDisplayDate(order.pickup_date)}</span>
              )}
              {order.pickup_time_slot && (
                <span className="capitalize">{order.pickup_time_slot}</span>
              )}
              <span>KES {order.estimated_total.toLocaleString()}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
