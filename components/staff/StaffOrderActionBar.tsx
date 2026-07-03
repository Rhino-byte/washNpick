"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import type { ApiOrder } from "@/lib/api";
import { getNextOrderStatus, ORDER_STATUS_LABELS } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StaffOrderActionBarProps {
  order: ApiOrder;
  note: string;
  onNoteChange: (value: string) => void;
  onAdvance: () => void;
  onNextOrder?: () => void;
  advancing: boolean;
  error: string;
  showNextPrompt: boolean;
}

export function StaffOrderActionBar({
  order,
  note,
  onNoteChange,
  onAdvance,
  onNextOrder,
  advancing,
  error,
  showNextPrompt,
}: StaffOrderActionBarProps) {
  const nextStatus = getNextOrderStatus(order.status);

  if (!nextStatus && order.status === "delivered") {
    return (
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <p className="text-center text-sm font-medium text-emerald-400">
          {order.id} — Delivered
        </p>
        {onNextOrder && (
          <Button variant="outline" size="md" fullWidth className="mt-2" onClick={onNextOrder}>
            Back to queue
          </Button>
        )}
      </div>
    );
  }

  if (!nextStatus) return null;

  return (
    <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
      <p className="mb-2 truncate font-mono text-xs text-muted">{order.id}</p>
      {showNextPrompt ? (
        <div className="space-y-2">
          <p className="text-center text-sm text-emerald-400">Status updated</p>
          {onNextOrder && (
            <Button variant="accent" size="lg" fullWidth onClick={onNextOrder}>
              Next order
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="mb-2 h-10 text-sm"
          />
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          <Button
            variant="accent"
            size="lg"
            fullWidth
            loading={advancing}
            loadingText="Updating"
            onClick={onAdvance}
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
