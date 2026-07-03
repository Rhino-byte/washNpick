import type { ApiOrder } from "./api";
import type { OrderFormData, OrderStatus, StoredOrder } from "./order-types";
import { calculateEstimatedTotal } from "./pricing";
import { services as fallbackServices } from "./mock-data";

const DRAFT_KEY = "freshfold-order-draft";

export function saveOrderDraft(data: Partial<OrderFormData>): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function loadOrderDraft(): Partial<OrderFormData> | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<OrderFormData>;
  } catch {
    return null;
  }
}

export function clearOrderDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function apiOrderToStored(order: ApiOrder, contact?: Partial<OrderFormData>): StoredOrder {
  const pickup = order.addresses.find((a) => a.type === "pickup");
  const trackableStatuses: OrderStatus[] = [
    "pending_pickup",
    "collected",
    "in_progress",
    "ready",
    "out_for_delivery",
    "delivered",
  ];
  const status = trackableStatuses.includes(order.status as OrderStatus)
    ? (order.status as OrderStatus)
    : "pending_pickup";

  return {
    id: order.id,
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    area: pickup?.area ?? "",
    formattedAddress: pickup?.formatted_address ?? "",
    placeId: "",
    landmark: pickup?.address_line ?? "",
    latitude: pickup?.latitude ?? null,
    longitude: pickup?.longitude ?? null,
    services: order.items.map((i) => ({
      serviceId: i.service_id as StoredOrder["services"][0]["serviceId"],
      quantity: i.quantity,
    })),
    estimatedWeightKg: order.estimated_weight_kg,
    specialInstructions: order.special_instructions,
    pickupDate: order.pickup_date ?? "",
    pickupTimeSlot: (order.pickup_time_slot ?? "morning") as StoredOrder["pickupTimeSlot"],
    sameDeliveryAddress: order.same_delivery_address,
    deliveryArea: "",
    deliveryFormattedAddress: "",
    deliveryPlaceId: "",
    deliveryLandmark: "",
    deliveryLatitude: null,
    deliveryLongitude: null,
    deliveryDate: order.delivery_date ?? "",
    paymentMethod: order.payment_method ?? "cod",
    status,
    estimatedTotal: order.estimated_total,
    createdAt: order.created_at,
    statusHistory: order.status_history.map((h) => ({
      status: h.status as OrderStatus,
      timestamp: h.created_at,
    })),
  };
}

export function getAvailablePickupDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function getStatusIndex(status: OrderStatus): number {
  const statuses: OrderStatus[] = [
    "pending_pickup",
    "collected",
    "in_progress",
    "ready",
    "out_for_delivery",
    "delivered",
  ];
  return statuses.indexOf(status);
}

function toApiAddress(
  lat: number,
  lng: number,
  landmark: string,
  formattedAddress: string,
  area: string,
  placeId: string,
) {
  return {
    latitude: lat,
    longitude: lng,
    address_line: landmark || null,
    formatted_address: formattedAddress || null,
    area: area || null,
    place_id: placeId || null,
  };
}

export function buildOrderPayload(data: OrderFormData) {
  if (data.latitude == null || data.longitude == null) {
    throw new Error("Pickup location is required");
  }

  const pickupAddress = toApiAddress(
    data.latitude,
    data.longitude,
    data.landmark,
    data.formattedAddress,
    data.area,
    data.placeId,
  );

  const deliveryAddress =
    !data.sameDeliveryAddress && data.deliveryLatitude != null && data.deliveryLongitude != null
      ? toApiAddress(
          data.deliveryLatitude,
          data.deliveryLongitude,
          data.deliveryLandmark,
          data.deliveryFormattedAddress,
          data.deliveryArea,
          data.deliveryPlaceId,
        )
      : null;

  return {
    services: data.services.map((s) => ({
      service_id: s.serviceId,
      quantity: s.quantity,
    })),
    estimated_weight_kg: data.estimatedWeightKg,
    special_instructions: data.specialInstructions,
    pickup_date: data.pickupDate,
    pickup_time_slot: data.pickupTimeSlot,
    delivery_date: data.deliveryDate || null,
    same_delivery_address: data.sameDeliveryAddress,
    pickup_address: pickupAddress,
    delivery_address: deliveryAddress,
    payment_method: data.paymentMethod,
  };
}

export function estimateFromForm(data: OrderFormData): number {
  return calculateEstimatedTotal(data, fallbackServices);
}
