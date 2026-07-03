"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api, ApiError, type ApiAddress } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

export function AccountAddresses() {
  const { profile, getToken } = useAuth();
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const list = await api.getMyAddresses(token);
        setAddresses(list);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load addresses.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, getToken]);

  if (!profile) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      <h2 className="font-semibold text-foreground">Saved addresses</h2>
      <p className="mt-1 text-xs text-muted">
        Default pickup updates when you place an order.
      </p>

      {loading && (
        <div className="flex justify-center py-8">
          <DottedSpinner size="md" />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {!loading && addresses.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted">
          No saved addresses yet. Complete an order to save your pickup location.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-start" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {addr.label ?? "Home"}
                    {addr.area ? ` · ${addr.area}` : ""}
                  </p>
                  {addr.formatted_address && (
                    <p className="mt-1 text-xs text-muted">{addr.formatted_address}</p>
                  )}
                  {addr.address_line && (
                    <p className="mt-0.5 text-xs text-muted">{addr.address_line}</p>
                  )}
                </div>
              </div>
              {addr.is_default && (
                <Badge variant="accent" className="shrink-0 text-[10px]">
                  Default
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
