"use client";

import { ORDER_STATUSES, ORDER_STATUS_LABELS, type StoredOrder } from "@/lib/order-types";
import { getStatusIndex } from "@/lib/order-storage";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StatusTimelineProps {
  order: StoredOrder;
}

export function StatusTimeline({ order }: StatusTimelineProps) {
  const currentIndex = getStatusIndex(order.status);

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-foreground">Order status</h3>
      <ol className="mt-4 space-y-0">
        {ORDER_STATUSES.map((status, index) => {
          const completed = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const historyEntry = order.statusHistory.find((h) => h.status === status);

          return (
            <li key={status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    completed && "step-active border-transparent text-white",
                    !completed && "border-border bg-surface text-muted",
                    isCurrent && "ring-4 ring-accent-start/20",
                  )}
                >
                  {completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-border" />
                  )}
                </div>
                {index < ORDER_STATUSES.length - 1 && (
                  <div
                    className={cn(
                      "min-h-[32px] w-0.5 flex-1",
                      index < currentIndex
                        ? "bg-gradient-to-b from-accent-start to-accent-mid"
                        : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className="pb-6">
                <p
                  className={cn(
                    "font-medium",
                    completed ? "text-foreground" : "text-muted",
                    isCurrent && "text-accent-start",
                  )}
                >
                  {ORDER_STATUS_LABELS[status]}
                </p>
                {historyEntry && (
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(historyEntry.timestamp).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {isCurrent && !historyEntry && (
                  <p className="mt-0.5 text-xs text-accent-start">Current status</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
