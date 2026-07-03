"use client";

import type { ApiOrderListItem } from "@/lib/api";
import { formatKES } from "@/lib/format";
import { formatDisplayDate } from "@/lib/order-storage";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

function formatOrderStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface OrderListCardProps {
  order: ApiOrderListItem;
  selected?: boolean;
  onSelect: () => void;
}

export function OrderListCard({ order, selected, onSelect }: OrderListCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "glass-card flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors",
        selected ? "selected-glow border-2" : "border border-border hover:bg-surface-elevated",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-semibold text-foreground">{order.id}</p>
        <p className="mt-1 text-xs text-muted">
          {order.pickup_date ? formatDisplayDate(order.pickup_date) : "Pickup TBD"}
          {" · "}
          {formatOrderStatus(order.status)}
        </p>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-accent-start">
          {formatKES(order.estimated_total)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted" />
      </div>
    </button>
  );
}
