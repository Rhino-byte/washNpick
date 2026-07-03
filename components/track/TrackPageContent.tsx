"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError, type ApiOrderListItem } from "@/lib/api";
import { apiOrderToStored } from "@/lib/order-storage";
import type { StoredOrder } from "@/lib/order-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DottedSpinner } from "@/components/ui/DottedSpinner";
import { StatusTimeline } from "@/components/track/StatusTimeline";
import { OrderListCard } from "@/components/track/OrderListCard";
import { OrderSummary } from "@/components/order/OrderSummary";
import { WhatsAppPlaceholder } from "@/components/WhatsAppPlaceholder";
import { Search, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

function GuestTrackForm({
  initialRef,
  onOrderFound,
}: {
  initialRef: string;
  onOrderFound: (order: StoredOrder) => void;
}) {
  const [orderRef, setOrderRef] = useState(initialRef);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!orderRef.trim()) {
      setError("Enter your order reference");
      setLoading(false);
      return;
    }
    if (phoneLast4.replace(/\D/g, "").length !== 4) {
      setError("Enter the last 4 digits of your phone number");
      setLoading(false);
      return;
    }

    try {
      const result = await api.trackOrder(orderRef.trim(), phoneLast4);
      onOrderFound(apiOrderToStored(result));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Order not found. Check your reference and phone digits.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div>
        <Label htmlFor="orderRef" required>
          Order reference
        </Label>
        <Input
          id="orderRef"
          placeholder="WP-20260627-A3K9"
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
        />
      </div>
      <div>
        <Label htmlFor="phoneLast4" required>
          Last 4 digits of phone
        </Label>
        <Input
          id="phoneLast4"
          type="tel"
          inputMode="numeric"
          maxLength={4}
          placeholder="5678"
          value={phoneLast4}
          onChange={(e) =>
            setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
      </div>
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        loadingText="Searching"
      >
        <Search className="h-4 w-4" />
        Track order
      </Button>
    </form>
  );
}

function OrderDetail({ order }: { order: StoredOrder }) {
  return (
    <div className="mt-6 space-y-4">
      <StatusTimeline order={order} />
      <OrderSummary data={order} showDisclaimer={false} estimatedTotal={order.estimatedTotal} />
      <div className="glass-card rounded-xl p-4 text-center text-sm text-muted">
        Order updates are sent automatically via WhatsApp
      </div>
      <WhatsAppPlaceholder orderRef={order.id} variant="button" />
    </div>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref")?.toUpperCase() ?? "";
  const { profile, syncingProfile, getToken } = useAuth();

  const [myOrders, setMyOrders] = useState<ApiOrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoredOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [guestOrder, setGuestOrder] = useState<StoredOrder | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(Boolean(initialRef));

  const loadMyOrders = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const orders = await api.getMyOrders(token);
      setMyOrders(orders);
    } catch (err) {
      setOrdersError(
        err instanceof ApiError ? err.message : "Could not load your orders.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (syncingProfile || !profile) return;
    void loadMyOrders();
  }, [syncingProfile, profile, loadMyOrders]);

  const handleSelectOrder = async (orderId: string) => {
    if (selectedId === orderId && selectedOrder) {
      setSelectedId(null);
      setSelectedOrder(null);
      return;
    }
    setSelectedId(orderId);
    setSelectedOrder(null);
    setDetailLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const full = await api.getOrder(token, orderId);
      setSelectedOrder(apiOrderToStored(full));
    } catch {
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-foreground">Track your order</h1>

      {profile ? (
        <>
          <p className="mt-1 text-sm text-muted">Your recent orders</p>

          {ordersLoading && (
            <div className="mt-6 flex justify-center py-8">
              <DottedSpinner size="md" />
            </div>
          )}

          {ordersError && (
            <p className="mt-4 text-sm text-red-300">{ordersError}</p>
          )}

          {!ordersLoading && myOrders.length === 0 && !ordersError && (
            <p className="mt-6 text-sm text-muted">
              No orders yet.{" "}
              <a href="/order" className="text-accent-start hover:underline">
                Place your first order
              </a>
            </p>
          )}

          {myOrders.length > 0 && (
            <div className="mt-4 space-y-2">
              {myOrders.map((o) => (
                <OrderListCard
                  key={o.id}
                  order={o}
                  selected={selectedId === o.id}
                  onSelect={() => void handleSelectOrder(o.id)}
                />
              ))}
            </div>
          )}

          {detailLoading && (
            <div className="mt-6 flex justify-center py-8">
              <DottedSpinner size="md" />
            </div>
          )}

          {selectedOrder && !detailLoading && <OrderDetail order={selectedOrder} />}

          <div className="mt-8 border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setShowGuestForm((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted hover:text-foreground"
            >
              Track another order
              {showGuestForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showGuestForm && (
              <div className="mt-4">
                <GuestTrackForm
                  initialRef={initialRef}
                  onOrderFound={(order) => {
                    setGuestOrder(order);
                    setSelectedId(null);
                    setSelectedOrder(null);
                  }}
                />
              </div>
            )}
          </div>

          {guestOrder && <OrderDetail order={guestOrder} />}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Enter your order reference and phone number to check status.
          </p>
          <div className="mt-6">
            <GuestTrackForm
              initialRef={initialRef}
              onOrderFound={setGuestOrder}
            />
          </div>
          {guestOrder && <OrderDetail order={guestOrder} />}
        </>
      )}
    </div>
  );
}

export function TrackPageContent() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}>
      <TrackContent />
    </Suspense>
  );
}
