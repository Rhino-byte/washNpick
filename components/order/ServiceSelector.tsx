"use client";

import { useServices } from "@/hooks/useServices";
import { formatKES } from "@/lib/format";
import type { OrderFormData, ServiceId } from "@/lib/order-types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Minus, Plus } from "lucide-react";

interface ServiceSelectorProps {
  data: OrderFormData;
  onChange: (updates: Partial<OrderFormData>) => void;
  errors?: Record<string, string>;
  estimatedTotal?: number;
}

export function ServiceSelector({
  data,
  onChange,
  errors,
  estimatedTotal,
}: ServiceSelectorProps) {
  const { services } = useServices();
  const total = estimatedTotal ?? 0;

  const toggleService = (serviceId: ServiceId) => {
    const exists = data.services.find((s) => s.serviceId === serviceId);
    if (exists) {
      onChange({
        services: data.services.filter((s) => s.serviceId !== serviceId),
      });
    } else {
      onChange({
        services: [...data.services, { serviceId, quantity: 1 }],
      });
    }
  };

  const updateQuantity = (serviceId: ServiceId, quantity: number) => {
    onChange({
      services: data.services.map((s) =>
        s.serviceId === serviceId
          ? { ...s, quantity: Math.min(50, Math.max(1, quantity)) }
          : s,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label required>Select services</Label>
        {errors?.services && (
          <p className="mb-2 text-sm text-red-400">{errors.services}</p>
        )}
        <div className="space-y-2">
          {services.map((service) => {
            const selected = data.services.some((s) => s.serviceId === service.id);
            const selection = data.services.find((s) => s.serviceId === service.id);

            return (
              <div
                key={service.id}
                className={cn(
                  "rounded-2xl border-2 p-4 transition-colors",
                  selected ? "selected-glow" : "glass-card border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                      selected
                        ? "border-accent-start bg-accent-start text-white"
                        : "border-border bg-transparent",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {service.name}
                      </span>
                      <span className="text-sm font-medium text-accent-start">
                        {service.priceLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{service.description}</p>
                  </div>
                </button>

                {selected && service.unit === "item" && selection && (
                  <div className="mt-3 ml-8">
                    <Label>Number of items</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(service.id, selection.quantity - 1)
                        }
                        disabled={selection.quantity <= 1}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Decrease ${service.name} quantity`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span
                        className="min-w-[2ch] text-center text-lg font-semibold tabular-nums text-foreground"
                        aria-live="polite"
                        aria-label={`${selection.quantity} items`}
                      >
                        {selection.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(service.id, selection.quantity + 1)
                        }
                        disabled={selection.quantity >= 50}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Increase ${service.name} quantity`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.services.some((s) => s.serviceId === "wash_fold") && (
        <div>
          <Label htmlFor="weight" required>
            Estimated weight (kg)
          </Label>
          <Input
            id="weight"
            type="number"
            min={1}
            max={50}
            value={data.estimatedWeightKg}
            onChange={(e) =>
              onChange({ estimatedWeightKg: parseInt(e.target.value) || 1 })
            }
            error={errors?.estimatedWeightKg}
          />
        </div>
      )}

      <div>
        <Label htmlFor="instructions">Special instructions</Label>
        <Textarea
          id="instructions"
          placeholder="Fabric care, stain notes, gate code..."
          value={data.specialInstructions}
          onChange={(e) => onChange({ specialInstructions: e.target.value })}
        />
      </div>

      <div className="gradient-border-card rounded-xl p-4 text-center">
        <p className="text-sm text-muted">Running estimate</p>
        <p className="text-2xl font-bold text-gradient">{formatKES(total)}</p>
      </div>
    </div>
  );
}
