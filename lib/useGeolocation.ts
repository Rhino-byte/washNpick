"use client";

import { useCallback, useState } from "react";

export type GeolocationState = "idle" | "loading" | "denied" | "error" | "success";

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setState("error");
        setErrorMessage("Location is not supported on this device.");
        reject(new Error("Geolocation not supported"));
        return;
      }

      setState("loading");
      setErrorMessage(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState("success");
          resolve(position.coords);
        },
        (error) => {
          const denied = error.code === error.PERMISSION_DENIED;
          setState(denied ? "denied" : "error");
          setErrorMessage(
            denied
              ? "Location permission denied. Search for your address instead."
              : "Could not get your location. Try again or search.",
          );
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  return { state, errorMessage, requestLocation };
}
