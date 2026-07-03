const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ApiService {
  id: string;
  name: string;
  description: string;
  unit: "kg" | "item";
  price_per_unit: number;
  price_label: string;
  turnaround: string;
  is_active: boolean;
}

export interface ApiAddress {
  id?: string;
  area?: string | null;
  address_line?: string | null;
  formatted_address?: string | null;
  place_id?: string | null;
  latitude: number;
  longitude: number;
  label?: string;
  is_default?: boolean;
}

export interface ApiUserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_burned: boolean;
  profile_complete: boolean;
  default_address: ApiAddress | null;
}

export interface ApiQuote {
  estimated_total: number;
  currency: string;
  requires_deposit: boolean;
  deposit_percent: number;
  deposit_amount: number;
  line_items: Array<{
    service_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface ApiOrder {
  id: string;
  status: string;
  estimated_total: number;
  final_total: number | null;
  payment_method: "mpesa" | "cod" | null;
  requires_deposit: boolean;
  deposit_amount: number;
  deposit_paid: boolean;
  estimated_weight_kg: number;
  special_instructions: string;
  pickup_date: string | null;
  pickup_time_slot: string | null;
  delivery_date: string | null;
  same_delivery_address: boolean;
  items: Array<{
    service_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  addresses: Array<{
    type: "pickup" | "delivery";
    area: string;
    address_line: string;
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  status_history: Array<{
    status: string;
    note: string | null;
    created_at: string;
  }>;
  created_at: string;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  getServices: () => request<ApiService[]>("/api/v1/services"),

  syncAuth: (token: string) =>
    request<{ user: ApiUserProfile; is_new: boolean }>("/api/v1/auth/sync", {
      method: "POST",
      token,
    }),

  getMe: (token: string) => request<ApiUserProfile>("/api/v1/me", { token }),

  updateMe: (
    token: string,
    data: { first_name?: string; last_name?: string; phone?: string },
  ) =>
    request<ApiUserProfile>("/api/v1/me", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  checkCoverage: (lat: number, lng: number) =>
    request<{ in_coverage: boolean; distance_km: number | null }>(
      `/api/v1/service-areas/check?lat=${lat}&lng=${lng}`,
    ),

  reverseGeocode: (lat: number, lng: number) =>
    request<{ formatted_address: string; area: string; place_id: string | null }>(
      `/api/v1/locations/reverse?lat=${lat}&lng=${lng}`,
    ),

  quoteOrder: (
    token: string | null,
    body: {
      services: Array<{ service_id: string; quantity: number }>;
      estimated_weight_kg: number;
    },
  ) =>
    request<ApiQuote>("/api/v1/orders/quote", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  createOrder: (
    token: string,
    body: {
      services: Array<{ service_id: string; quantity: number }>;
      estimated_weight_kg: number;
      special_instructions: string;
      pickup_date: string;
      pickup_time_slot: string;
      delivery_date: string | null;
      same_delivery_address: boolean;
      pickup_address: ApiAddress;
      delivery_address?: ApiAddress | null;
      payment_method: "mpesa" | "cod";
    },
  ) =>
    request<ApiOrder>("/api/v1/orders", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  stkPush: (
    token: string,
    body: { order_id: string; payment_type?: string; phone?: string },
  ) =>
    request<{ payment_id: string; checkout_request_id: string | null; message: string }>(
      "/api/v1/payments/mpesa/stk-push",
      { method: "POST", token, body: JSON.stringify(body) },
    ),

  trackOrder: (ref: string, phoneLast4: string) =>
    request<ApiOrder>(
      `/api/v1/orders/track?ref=${encodeURIComponent(ref)}&phone_last4=${encodeURIComponent(phoneLast4)}`,
    ),
};
