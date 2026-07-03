"use client";

import { useEffect, useState } from "react";
import { api, type ApiService } from "@/lib/api";
import { services as fallbackServices } from "@/lib/mock-data";
import type { ServiceDefinition } from "@/lib/mock-data";

function toDefinition(s: ApiService): ServiceDefinition {
  return {
    id: s.id as ServiceDefinition["id"],
    name: s.name,
    description: s.description,
    turnaround: s.turnaround,
    priceLabel: s.price_label,
    unit: s.unit,
    pricePerUnit: s.price_per_unit,
    imageKey:
      s.id === "wash_fold"
        ? "wash_fold"
        : s.id === "duvet_king_queen"
          ? "duvet_king_queen"
          : "double_duvet",
  };
}

let cache: ServiceDefinition[] | null = null;

export function useServices() {
  const [catalog, setCatalog] = useState<ServiceDefinition[]>(cache ?? fallbackServices);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    api
      .getServices()
      .then((data) => {
        const mapped = data.map(toDefinition);
        cache = mapped;
        setCatalog(mapped);
      })
      .catch(() => setCatalog(fallbackServices))
      .finally(() => setLoading(false));
  }, []);

  return { services: catalog, loading };
}
