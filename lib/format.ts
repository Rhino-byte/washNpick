import { siteConfig } from "./site-config";

export function formatKES(amount: number): string {
  return `${siteConfig.currency} ${amount.toLocaleString("en-KE")}`;
}

export function formatPhoneDisplay(digits: string): string {
  const cleaned = digits.replace(/\D/g, "");
  const local = cleaned.startsWith("254")
    ? cleaned.slice(3)
    : cleaned.startsWith("0")
      ? cleaned.slice(1)
      : cleaned;

  if (local.length <= 3) return local;
  if (local.length <= 6) return `${local.slice(0, 3)} ${local.slice(3)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
}

export function normalizePhone(digits: string): string {
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return `254${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `254${cleaned}`;
  return cleaned;
}

export function phoneLastFour(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized.slice(-4);
}
