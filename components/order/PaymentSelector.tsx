"use client";

import { formatKES } from "@/lib/format";
import type { PaymentMethod } from "@/lib/order-types";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  isBurned: boolean;
  depositAmount?: number;
  estimatedTotal: number;
}

export function PaymentSelector({
  value,
  onChange,
  isBurned,
  depositAmount = 0,
  estimatedTotal,
}: PaymentSelectorProps) {
  return (
    <div className="space-y-3">
      {isBurned && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          A deposit of {formatKES(depositAmount)} ({Math.round((depositAmount / estimatedTotal) * 100)}%)
          is required via M-Pesa before we accept your order. Remainder can be paid on delivery (COD).
        </div>
      )}

      <Label required>Payment method</Label>

      {!isBurned && (
        <button
          type="button"
          onClick={() => onChange("cod")}
          className={cn(
            "w-full rounded-xl border-2 p-4 text-left transition-colors",
            value === "cod" ? "selected-glow" : "glass-card border-border",
          )}
        >
          <p className="font-semibold text-foreground">Cash on delivery (COD)</p>
          <p className="mt-1 text-sm text-muted">Pay when your laundry is delivered</p>
        </button>
      )}

      <button
        type="button"
        onClick={() => onChange("mpesa")}
        className={cn(
          "w-full rounded-xl border-2 p-4 text-left transition-colors",
          value === "mpesa" ? "selected-glow" : "glass-card border-border",
        )}
      >
        <p className="font-semibold text-foreground">M-Pesa</p>
        <p className="mt-1 text-sm text-muted">
          {isBurned
            ? `Pay ${formatKES(depositAmount)} deposit now via STK push`
            : `Pay ${formatKES(estimatedTotal)} now via STK push`}
        </p>
      </button>

      {isBurned && value === "cod" && (
        <p className="text-sm text-red-400">
          Burned users must pay the deposit via M-Pesa. COD is only for the remaining balance on delivery.
        </p>
      )}
    </div>
  );
}
