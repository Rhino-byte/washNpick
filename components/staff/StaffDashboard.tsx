"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, ApiError, type ApiOrder, type ApiStaffOrderListItem } from "@/lib/api";
import { todayInBusinessTz } from "@/lib/pickup-scheduling";
import {
  getNextOrderStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffOrderList } from "./StaffOrderList";
import { StaffOrderDetail } from "./StaffOrderDetail";
import { StaffOrderActionBar } from "./StaffOrderActionBar";

type FilterTab = "today" | "active" | "all";

function getNextOrderId(
  currentId: string,
  orders: ApiStaffOrderListItem[],
): string | null {
  const idx = orders.findIndex((o) => o.id === currentId);
  if (idx === -1 || idx >= orders.length - 1) return null;
  return orders[idx + 1]?.id ?? null;
}

function patchOrderInList(
  orders: ApiStaffOrderListItem[],
  orderId: string,
  status: string,
): ApiStaffOrderListItem[] {
  return orders.map((o) => (o.id === orderId ? { ...o, status } : o));
}

export function StaffDashboard() {
  const { getToken, signOut, signOutLoading } = useAuth();
  const [staffName, setStaffName] = useState("");
  const [orders, setOrders] = useState<ApiStaffOrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("today");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [advanceError, setAdvanceError] = useState("");
  const [note, setNote] = useState("");
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [pendingNextId, setPendingNextId] = useState<string | null>(null);

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
      return list;
    } catch (err) {
      setOrdersError(err instanceof ApiError ? err.message : "Could not load orders.");
      return null;
    } finally {
      setOrdersLoading(false);
    }
  }, [filter, statusFilter, search, getToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      setSelectedId(orderId);
      setDetail(null);
      setDetailLoading(true);
      setAdvanceError("");
      setShowNextPrompt(false);
      setPendingNextId(null);
      setNote("");
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

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setAdvanceError("");
    setShowNextPrompt(false);
    setPendingNextId(null);
    setNote("");
  }, []);

  const handleAdvance = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      advanceNote?: string,
      options?: { openDetailAfter?: boolean; autoNext?: boolean },
    ) => {
      setAdvancingId(orderId);
      setAdvanceError("");
      try {
        const token = await getToken();
        if (!token) return;

        const updated = await api.updateStaffOrderStatus(token, orderId, {
          status,
          note: advanceNote,
        });

        const patched = patchOrderInList(orders, orderId, updated.status);
        setOrders(patched);

        if (selectedId === orderId) {
          setDetail(updated);
        }

        const nextId = getNextOrderId(orderId, patched);

        if (options?.autoNext) {
          setNote("");
          if (nextId && (selectedId === orderId || options.openDetailAfter)) {
            void loadDetail(nextId);
          } else if (selectedId === orderId && !nextId) {
            setShowNextPrompt(true);
            setPendingNextId(null);
          }
          return;
        }

        if (selectedId === orderId) {
          setShowNextPrompt(true);
          setPendingNextId(nextId);
          setNote("");
        }
      } catch (err) {
        setAdvanceError(err instanceof ApiError ? err.message : "Could not update status.");
      } finally {
        setAdvancingId(null);
      }
    },
    [getToken, orders, selectedId, loadDetail],
  );

  const handleQuickAdvance = (orderId: string, nextStatus: OrderStatus) => {
    void handleAdvance(orderId, nextStatus, undefined, { autoNext: false });
  };

  const handleDetailAdvance = () => {
    if (!detail) return;
    const next = getNextOrderStatus(detail.status);
    if (!next) return;
    void handleAdvance(detail.id, next, note.trim() || undefined, { autoNext: true });
  };

  const handleNextOrderClick = () => {
    if (pendingNextId) {
      void loadDetail(pendingNextId);
      return;
    }
    closeDetail();
  };

  const inDetailView = Boolean(selectedId);

  return (
    <div className={inDetailView ? "pb-0" : "pb-24"}>
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          {inDetailView ? (
            <button
              type="button"
              onClick={closeDetail}
              className="flex items-center gap-1 text-sm font-medium text-accent-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Queue
            </button>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-foreground">Staff dashboard</h1>
              {staffName && <p className="text-sm text-muted">Signed in as {staffName}</p>}
            </div>
          )}
          {inDetailView && selectedId && (
            <p className="truncate font-mono text-sm font-semibold text-foreground">{selectedId}</p>
          )}
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
                onClick={() => setFilter(key)}
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

          <StaffOrderList
            orders={orders}
            selectedId={selectedId}
            onSelect={(id) => void loadDetail(id)}
            onQuickAdvance={handleQuickAdvance}
            advancingId={advancingId}
            loading={ordersLoading}
          />
        </div>
      )}

      {inDetailView && (
        <div className="px-4 py-4">
          <StaffOrderDetail order={detail} loading={detailLoading} />
        </div>
      )}

      {inDetailView && detail && !detailLoading && (
        <StaffOrderActionBar
          order={detail}
          note={note}
          onNoteChange={setNote}
          onAdvance={handleDetailAdvance}
          onNextOrder={handleNextOrderClick}
          advancing={advancingId === detail.id}
          error={advanceError}
          showNextPrompt={showNextPrompt}
        />
      )}
    </div>
  );
}
