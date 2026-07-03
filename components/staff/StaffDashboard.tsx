"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, ApiError, type ApiOrder, type ApiStaffOrderListItem } from "@/lib/api";
import { todayInBusinessTz } from "@/lib/pickup-scheduling";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffOrderList } from "./StaffOrderList";
import { StaffOrderDetail } from "./StaffOrderDetail";

type FilterTab = "today" | "active" | "all";

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
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState("");

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

  const loadDetail = useCallback(
    async (orderId: string) => {
      setSelectedId(orderId);
      setDetail(null);
      setDetailLoading(true);
      setAdvanceError("");
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

  const handleAdvance = async (status: string, note?: string) => {
    if (!selectedId) return;
    setAdvancing(true);
    setAdvanceError("");
    try {
      const token = await getToken();
      if (!token) return;
      const updated = await api.updateStaffOrderStatus(token, selectedId, { status, note });
      setDetail(updated);
      await loadOrders();
    } catch (err) {
      setAdvanceError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Staff dashboard</h1>
            {staffName && <p className="text-sm text-muted">Signed in as {staffName}</p>}
          </div>
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
          loading={ordersLoading}
        />

        {selectedId && (
          <div className="border-t border-border pt-4">
            <StaffOrderDetail
              order={detail}
              loading={detailLoading}
              onAdvance={handleAdvance}
              advancing={advancing}
              error={advanceError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
