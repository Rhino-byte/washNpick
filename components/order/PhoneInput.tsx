"use client";

import { formatPhoneDisplay, normalizePhone } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function PhoneInput({ value, onChange, error }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
    onChange(digits);
  };

  const displayValue = value ? formatPhoneDisplay(value) : "";

  return (
    <div>
      <Label htmlFor="phone" required>
        Phone number
      </Label>
      <div className="flex gap-2">
        <div className="flex h-12 shrink-0 items-center rounded-xl border border-border bg-surface px-3 text-sm font-medium text-muted">
          +254
        </div>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="712 345 678"
          value={displayValue}
          onChange={handleChange}
          error={error}
          aria-describedby="phone-hint"
        />
      </div>
      <p id="phone-hint" className="mt-1.5 text-xs text-muted">
        WhatsApp number preferred for pickup updates and coordination
      </p>
      <input type="hidden" value={normalizePhone(value)} />
    </div>
  );
}
