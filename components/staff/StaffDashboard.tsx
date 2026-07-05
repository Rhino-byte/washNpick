"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, ApiError, type ApiOrder, type ApiStaffOrderListItem } from "@/lib/api";
import { todayInBusinessTz } from "@/lib/pickup-scheduling";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-types";
import { findNextActionableOrder } from "@/lib/staff-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffOrderList } from "./StaffOrderList";
import { StaffOrderDetail } from "./StaffOrderDetail";
import { StaffOrderActionBar } from "./StaffOrderActionBar";

type FilterTab = "today" | "active" | "all";
type AdvanceSource = "quick" | "detail";

export function StaffDashboard() {
  const { getToken, signOut, signOutLoading } = useAuth();
  const [staffName, setStaffName] = useState("");
  const [orders, setOrders] = useState<ApiStaffOrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [advancingOrderId, setAdvancingOrderId] = useState<string | null>(null);
  const [advanceError, setAdvanceError] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [successFlashId, setSuccessFlashId] = useState<string | null>(null);
  const [caughtUpMessage, setCaughtUpMessage] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const token = await getToken();
      if (!token) return;
      const me = await api.getStaffMe(token);
      setStaffName(me.display_name);

      const params: Parameters<typeof api.listStaffOrders>[1] = {};
      if (filter === "today") {
        params.pickup_date = todayInBusinessTz();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (search.trim().length >= 2) {
        params.search = search.trim();
      }
      if (filter === "all") {
        params.include_cancelled = true;
      }

      const list = await api.listStaffOrders(token, params);
      setOrders(list);
    } catch (err) {
      setOrdersError(err instanceof ApiError ? err.message : "Could not load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [filter, statusFilter, search, getToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const flashSuccess = useCallback((orderId: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setSuccessFlashId(orderId);
    flashTimerRef.current = setTimeout(() => {
      setSuccessFlashId(null);
      flashTimerRef.current = null;
    }, 300);
  }, []);

  const patchOrderInList = useCallback((orderId: string, status: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );
  }, []);

  const loadDetail = useCallback(
    async (orderId: string) => {
      setSelectedId(orderId);
      setDetail(null);
      setDetailLoading(true);
      setAdvanceError("");
      setCaughtUpMessage(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        const token = await getToken();
        if (!token) return;
        const order = await api.getStaffOrder(token, orderId);
        setDetail(order);
      } catch {
        setSelectedId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [getToken],
  );

  const backToQueue = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setAdvanceError("");
    setCaughtUpMessage(false);
  }, []);

  const goToNextOrder = useCallback(
    (completedOrderId: string, source: AdvanceSource, updatedOrders: ApiStaffOrderListItem[]) => {
      const next = findNextActionableOrder(updatedOrders, completedOrderId);

      if (source === "quick") {
        setHighlightId(next?.id ?? null);
        if (!next) {
          setCaughtUpMessage(true);
        }
        return;
      }

      if (next) {
        void loadDetail(next.id);
        setHighlightId(null);
      } else {
        backToQueue();
        setCaughtUpMessage(true);
      }
    },
    [loadDetail, backToQueue],
  );

  const advanceOrder = useCallback(
    async (orderId: string, status: string, source: AdvanceSource, note?: string) => {
      setAdvancingOrderId(orderId);
      setAdvanceError("");
      try {
        const token = await getToken();
        if (!token) return;
        const updated = await api.updateStaffOrderStatus(token, orderId, { status, note });

        patchOrderInList(orderId, updated.status);
        flashSuccess(orderId);

        if (selectedId === orderId) {
          setDetail(updated);
        }

        const updatedOrders = orders.map((o) =>
          o.id === orderId ? { ...o, status: updated.status } : o,
        );

        setTimeout(() => {
          goToNextOrder(orderId, source, updatedOrders);
        }, 300);
      } catch (err) {
        setAdvanceError(err instanceof ApiError ? err.message : "Could not update status.");
        void loadOrders();
      } finally {
        setAdvancingOrderId(null);
      }
    },
    [
      getToken,
      patchOrderInList,
      flashSuccess,
      selectedId,
      orders,
      goToNextOrder,
      loadOrders,
    ],
  );

  const inDetailView = selectedId !== null;

  return (
    <div className={inDetailView ? "pb-36" : "pb-24"}>
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {inDetailView && (
              <Button
                variant="ghost"
                size="sm"
                overlay={false}
                onClick={backToQueue}
                aria-label="Back to queue"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">
                {inDetailView ? "Order detail" : "Staff dashboard"}
              </h1>
              {staffName && !inDetailView && (
                <p className="text-sm text-muted">Signed in as {staffName}</p>
              )}
              {inDetailView && selectedId && (
                <p className="truncate font-mono text-sm text-muted">{selectedId}</p>
              )}
            </div>
          </div>
          {!inDetailView && (
            <Button
              variant="ghost"
              size="sm"
              loading={signOutLoading}
              overlay={false}
              onClick={() => void signOut()}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!inDetailView && (
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Today's pickups"],
                ["active", "Active"],
                ["all", "All"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setCaughtUpMessage(false);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  filter === key
                    ? "bg-accent-start text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {label}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => void loadOrders()} overlay={false}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search ref, phone, name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {ordersError && <p className="text-sm text-red-400">{ordersError}</p>}

          {caughtUpMessage && (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              All caught up for this filter.
            </p>
          )}

          <StaffOrderList
            orders={orders}
            selectedId={selectedId}
            highlightId={highlightId}
            successFlashId={successFlashId}
            advancingOrderId={advancingOrderId}
            onSelect={(id) => void loadDetail(id)}
            onQuickAdvance={(id, nextStatus) =>
              void advanceOrder(id, nextStatus, "quick")
            }
            loading={ordersLoading}
          />
        </div>
      )}

      {inDetailView && (
        <div className="px-4 py-4">
          {caughtUpMessage && (
            <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              All caught up for this filter.
            </p>
          )}
          <StaffOrderDetail order={detail} loading={detailLoading} />
        </div>
      )}

      {inDetailView && detail && !detailLoading && (
        <StaffOrderActionBar
          key={detail.id}
          order={detail}
          advancing={advancingOrderId === detail.id}
          error={advanceError}
          onAdvance={(status, note) => void advanceOrder(detail.id, status, "detail", note)}
        />
      )}
    </div>
  );
}
