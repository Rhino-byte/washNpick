"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface PageLoadingContextValue {
  isActive: boolean;
  setOverlayActive: (id: string, active: boolean) => void;
}

const PageLoadingContext = createContext<PageLoadingContextValue | null>(null);

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const activeIdsRef = useRef(new Set<string>());
  const [isActive, setIsActive] = useState(false);

  const setOverlayActive = useCallback((id: string, active: boolean) => {
    const ids = activeIdsRef.current;
    if (active) ids.add(id);
    else ids.delete(id);
    setIsActive(ids.size > 0);
  }, []);

  const value = useMemo(
    () => ({ isActive, setOverlayActive }),
    [isActive, setOverlayActive],
  );

  return (
    <PageLoadingContext.Provider value={value}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  const ctx = useContext(PageLoadingContext);
  if (!ctx) {
    throw new Error("usePageLoading must be used within PageLoadingProvider");
  }
  return ctx;
}
