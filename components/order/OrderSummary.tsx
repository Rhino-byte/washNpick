"use client";

import { useServices } from "@/hooks/useServices";
import { formatKES } from "@/lib/format";
import { calculateEstimatedTotal } from "@/lib/pricing";
import type { OrderFormData } from "@/lib/order-types";
import { TIME_SLOT_LABELS } from "@/lib/order-types";
import { formatDisplayDate } from "@/lib/order-storage";

interface OrderSummaryProps {
  data: OrderFormData;
  showDisclaimer?: boolean;
  estimatedTotal?: number;
}

export function OrderSummary({
  data,
  showDisclaimer = true,
  estimatedTotal,
}: OrderSummaryProps) {
  const { services } = useServices();
  const total = estimatedTotal ?? calculateEstimatedTotal(data, services);

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-foreground">Order summary</h3>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Contact</span>
          <span className="text-right text-foreground">
            {[data.firstName, data.lastName].filter(Boolean).join(" ") || "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Pickup</span>
          <span className="max-w-[60%] text-right text-foreground">
            {data.formattedAddress || "Pin on map"}
            {data.landmark ? ` · ${data.landmark}` : ""}
          </span>
        </div>
        {data.pickupDate && (
          <div className="flex justify-between">
            <span className="text-muted">When</span>
            <span className="text-right text-foreground">
              {formatDisplayDate(data.pickupDate)},{" "}
              {TIME_SLOT_LABELS[data.pickupTimeSlot]}
            </span>
          </div>
        )}
        {data.paymentMethod && (
          <div className="flex justify-between">
            <span className="text-muted">Payment</span>
            <span className="text-right text-foreground uppercase">
              {data.paymentMethod === "mpesa" ? "M-Pesa" : "COD"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-sm font-medium text-foreground/90">Services</p>
        <ul className="mt-2 space-y-1">
          {data.services.map((sel) => {
            const svc = services.find((s) => s.id === sel.serviceId);
            if (!svc) return null;
            return (
              <li key={sel.serviceId} className="flex justify-between text-sm">
                <span className="text-muted">{svc.name}</span>
                <span className="text-foreground">
                  {svc.unit === "kg"
                    ? `${data.estimatedWeightKg} kg`
                    : `${sel.quantity} items`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-foreground">Estimated total</span>
        <span className="text-lg font-bold text-gradient">{formatKES(total)}</span>
      </div>

      {showDisclaimer && (
        <p className="mt-3 text-xs text-muted">
          Final price confirmed after weighing your laundry at collection.
        </p>
      )}
    </div>
  );
}
