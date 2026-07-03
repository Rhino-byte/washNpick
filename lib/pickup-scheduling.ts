import type { TimeSlot } from "@/lib/order-types";

export const BUSINESS_TIMEZONE = "Africa/Nairobi";

export const TIME_SLOT_ORDER: TimeSlot[] = ["morning", "afternoon", "evening"];

/** Local hour when each slot starts (24h, Africa/Nairobi). */
export const SLOT_START_HOUR: Record<TimeSlot, number> = {
  morning: 8,
  afternoon: 12,
  evening: 16,
};

export function formatIsoDateInBusinessTz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(date);
}

export function todayInBusinessTz(): string {
  return formatIsoDateInBusinessTz(new Date());
}

function minutesSinceMidnightInBusinessTz(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Slot is available if its start time has not been reached yet (for today). */
export function isPickupSlotAvailable(
  pickupDate: string,
  slot: TimeSlot,
  now: Date = new Date(),
): boolean {
  const today = todayInBusinessTz();
  if (pickupDate > today) return true;
  if (pickupDate < today) return false;

  const nowMinutes = minutesSinceMidnightInBusinessTz(now);
  const slotStartMinutes = SLOT_START_HOUR[slot] * 60;
  return nowMinutes < slotStartMinutes;
}

export function getAvailableTimeSlots(
  pickupDate: string,
  now: Date = new Date(),
): TimeSlot[] {
  return TIME_SLOT_ORDER.filter((slot) => isPickupSlotAvailable(pickupDate, slot, now));
}

export function getFirstAvailableTimeSlot(
  pickupDate: string,
  now: Date = new Date(),
): TimeSlot | null {
  const slots = getAvailableTimeSlots(pickupDate, now);
  return slots[0] ?? null;
}

export function getAvailablePickupDates(now: Date = new Date(), days = 7): string[] {
  const dates: string[] = [];
  const base = new Date(now);

  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = formatIsoDateInBusinessTz(d);
    if (getAvailableTimeSlots(iso, now).length > 0) {
      dates.push(iso);
    }
  }

  return dates;
}

export function pickupSlotUnavailableMessage(pickupDate: string, slot: TimeSlot): string {
  if (pickupDate === todayInBusinessTz()) {
    return `The ${slot} slot has already started. Choose a later time or another date.`;
  }
  return "This pickup time is no longer available.";
}
