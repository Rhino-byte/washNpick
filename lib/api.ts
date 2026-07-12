const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 15_000;

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
  const { token, headers, signal: externalSignal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        `Could not reach the server at ${API_URL}. Make sure the backend is running.`,
        0,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }

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

export interface ApiOrderListItem {
  id: string;
  status: string;
  estimated_total: number;
  pickup_date: string | null;
  created_at: string;
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
    address_line: string | null;
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

export interface ApiStaffMember {
  id: string;
  firebase_uid: string;
  display_name: string;
  email: string;
}

export interface ApiStaffOrderListItem {
  id: string;
  status: string;
  estimated_total: number;
  pickup_date: string | null;
  pickup_time_slot: string | null;
  created_at: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
}

export interface ApiWhatsappMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  twilio_message_sid: string | null;
  twilio_status: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ApiWhatsappEscalation {
  id: string;
  conversation_id: string;
  reason: string;
  status: "open" | "claimed" | "resolved";
  claimed_by_staff_id: string | null;
  created_at: string;
  claimed_at: string | null;
  resolved_at: string | null;
}

export interface ApiWhatsappConversationSummary {
  id: string;
  customer_phone: string;
  state: "bot" | "escalated" | "closed";
  order_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  open_escalation_id: string | null;
}

export interface ApiWhatsappConversationDetail {
  id: string;
  customer_phone: string;
  state: "bot" | "escalated" | "closed";
  order_id: string | null;
  last_message_at: string | null;
  messages: ApiWhatsappMessage[];
  escalations: ApiWhatsappEscalation[];
}

export interface ApiStaffMessagingAnalytics {
  from: string;
  to: string;
  outbound: {
    total: number;
    delivered: number;
    sent: number;
    failed: number;
  };
  inbound_count: number;
  escalations: {
    open: number;
    resolved: number;
    avg_claim_seconds: number | null;
  };
  errors: Array<{
    error_code: string;
    error_message: string | null;
    count: number;
    last_seen: string | null;
    sample_message: string | null;
  }>;
  recent_failures: Array<{
    id: string;
    order_id: string;
    recipient_phone: string;
    error_code: string | null;
    error_message: string | null;
    message_body: string | null;
    created_at: string | null;
  }>;
}

export interface ApiWhatsappBotConfig {
  id: string | null;
  system_prompt: string;
  updated_at: string | null;
  updated_by_name: string | null;
}

export interface ApiWhatsappBotPreview {
  action: "reply" | "escalate";
  message: string;
  reason: string | null;
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

  getMyOrders: (token: string) =>
    request<ApiOrderListItem[]>("/api/v1/me/orders", { token }),

  getMyAddresses: (token: string) =>
    request<ApiAddress[]>("/api/v1/me/addresses", { token }),

  getOrder: (token: string, orderId: string) =>
    request<ApiOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}`, { token }),

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

  getStaffMe: (token: string) =>
    request<ApiStaffMember>("/api/v1/staff/me", { token }),

  listStaffOrders: (
    token: string,
    params?: {
      status?: string;
      pickup_date?: string;
      search?: string;
      include_cancelled?: boolean;
    },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.pickup_date) qs.set("pickup_date", params.pickup_date);
    if (params?.search) qs.set("search", params.search);
    if (params?.include_cancelled) qs.set("include_cancelled", "true");
    const query = qs.toString();
    return request<ApiStaffOrderListItem[]>(
      `/api/v1/staff/orders${query ? `?${query}` : ""}`,
      { token },
    );
  },

  getStaffOrder: (token: string, orderId: string) =>
    request<ApiOrder>(`/api/v1/staff/orders/${encodeURIComponent(orderId)}`, { token }),

  updateStaffOrderStatus: (
    token: string,
    orderId: string,
    body: { status: string; note?: string | null },
  ) =>
    request<ApiOrder>(`/api/v1/staff/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    }),

  setStaffFinalTotal: (token: string, orderId: string, final_total: number) =>
    request<ApiOrder>(`/api/v1/staff/orders/${encodeURIComponent(orderId)}/final-total`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ final_total }),
    }),

  getStaffMessagingAnalytics: (
    token: string,
    params?: { from?: string; to?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const query = qs.toString();
    return request<ApiStaffMessagingAnalytics>(
      `/api/v1/staff/messages/analytics${query ? `?${query}` : ""}`,
      { token },
    );
  },

  listStaffConversations: (token: string, state?: string) => {
    const qs = state ? `?state=${encodeURIComponent(state)}` : "";
    return request<ApiWhatsappConversationSummary[]>(
      `/api/v1/staff/messages/conversations${qs}`,
      { token },
    );
  },

  getStaffConversation: (token: string, conversationId: string) =>
    request<ApiWhatsappConversationDetail>(
      `/api/v1/staff/messages/conversations/${encodeURIComponent(conversationId)}`,
      { token },
    ),

  replyStaffConversation: (token: string, conversationId: string, body: string) =>
    request<ApiWhatsappMessage>(
      `/api/v1/staff/messages/conversations/${encodeURIComponent(conversationId)}/reply`,
      { method: "POST", token, body: JSON.stringify({ body }) },
    ),

  patchStaffEscalation: (token: string, escalationId: string, status: string) =>
    request<ApiWhatsappEscalation>(
      `/api/v1/staff/messages/escalations/${encodeURIComponent(escalationId)}`,
      { method: "PATCH", token, body: JSON.stringify({ status }) },
    ),

  sendStaffTestMessage: (token: string, phone: string, body?: string) =>
    request<{ ok: boolean; sid: string; status: string }>("/api/v1/staff/messages/test", {
      method: "POST",
      token,
      body: JSON.stringify({ phone, body }),
    }),

  getStaffBotConfig: (token: string) =>
    request<ApiWhatsappBotConfig>("/api/v1/staff/messages/bot-config", { token }),

  updateStaffBotConfig: (token: string, system_prompt: string) =>
    request<ApiWhatsappBotConfig>("/api/v1/staff/messages/bot-config", {
      method: "PUT",
      token,
      body: JSON.stringify({ system_prompt }),
    }),

  previewStaffBotConfig: (
    token: string,
    body: { sample_message: string; system_prompt?: string },
  ) =>
    request<ApiWhatsappBotPreview>("/api/v1/staff/messages/bot-config/preview", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),
};
