export const ORDER_STATUSES = [
  "pending_pickup",
  "collected",
  "in_progress",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_pickup: "Pending pickup",
  collected: "Collected",
  in_progress: "In progress",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export type TimeSlot = "morning" | "afternoon" | "evening";

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning (8 AM – 12 PM)",
  afternoon: "Afternoon (12 PM – 4 PM)",
  evening: "Evening (4 PM – 8 PM)",
};

export type ServiceId = "wash_fold" | "duvet_king_queen" | "double_duvet";

export interface ServiceSelection {
  serviceId: ServiceId;
  quantity: number;
}

export type PaymentMethod = "mpesa" | "cod";

export interface LocationFields {
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  area: string;
  placeId: string;
  landmark: string;
}

export interface OrderFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  services: ServiceSelection[];
  estimatedWeightKg: number;
  specialInstructions: string;
  pickupDate: string;
  pickupTimeSlot: TimeSlot;
  sameDeliveryAddress: boolean;
  deliveryDate: string;
  paymentMethod: PaymentMethod;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  area: string;
  placeId: string;
  landmark: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryFormattedAddress: string;
  deliveryArea: string;
  deliveryPlaceId: string;
  deliveryLandmark: string;
}

export interface StoredOrder extends OrderFormData {
  id: string;
  status: OrderStatus;
  estimatedTotal: number;
  createdAt: string;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
  }>;
}

export const defaultLocationFields: LocationFields = {
  latitude: null,
  longitude: null,
  formattedAddress: "",
  area: "",
  placeId: "",
  landmark: "",
};

export const defaultOrderFormData: OrderFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  services: [],
  estimatedWeightKg: 5,
  specialInstructions: "",
  pickupDate: "",
  pickupTimeSlot: "morning",
  sameDeliveryAddress: true,
  deliveryDate: "",
  paymentMethod: "cod",
  ...defaultLocationFields,
  deliveryLatitude: null,
  deliveryLongitude: null,
  deliveryFormattedAddress: "",
  deliveryArea: "",
  deliveryPlaceId: "",
  deliveryLandmark: "",
};

export function locationFromForm(data: OrderFormData): LocationFields {
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    formattedAddress: data.formattedAddress,
    area: data.area,
    placeId: data.placeId,
    landmark: data.landmark,
  };
}

export function deliveryLocationFromForm(data: OrderFormData): LocationFields {
  return {
    latitude: data.deliveryLatitude,
    longitude: data.deliveryLongitude,
    formattedAddress: data.deliveryFormattedAddress,
    area: data.deliveryArea,
    placeId: data.deliveryPlaceId,
    landmark: data.deliveryLandmark,
  };
}

export function applyLocationToForm(
  data: OrderFormData,
  location: LocationFields,
  target: "pickup" | "delivery",
): OrderFormData {
  if (target === "pickup") {
    return { ...data, ...location };
  }
  return {
    ...data,
    deliveryLatitude: location.latitude,
    deliveryLongitude: location.longitude,
    deliveryFormattedAddress: location.formattedAddress,
    deliveryArea: location.area,
    deliveryPlaceId: location.placeId,
    deliveryLandmark: location.landmark,
  };
}
