"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import type { ApiOrder } from "@/lib/api";
import {
  getNextOrderStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatStatusLabel(status: string): string {
  if (status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface StaffOrderActionBarProps {
  order: ApiOrder;
  advancing: boolean;
  error: string;
  onAdvance: (status: string, note?: string) => void;
}

export function StaffOrderActionBar({
  order,
  advancing,
  error,
  onAdvance,
}: StaffOrderActionBarProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const nextStatus = getNextOrderStatus(order.status);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px] border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-mono font-semibold text-foreground">{order.id}</span>
        <span className="shrink-0 text-muted">{formatStatusLabel(order.status)}</span>
      </div>

      {nextStatus ? (
        <>
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-accent-start"
          >
            {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {noteOpen ? "Hide note" : "Add note"}
          </button>
          {noteOpen && (
            <Input
              className="mt-2"
              placeholder="e.g. Picked up at gate"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="mt-3"
            loading={advancing}
            loadingText="Updating"
            onClick={() => onAdvance(nextStatus, note.trim() || undefined)}
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <p className="mt-2 text-center text-sm text-emerald-400">Order delivered.</p>
      )}
    </div>
  );
}
