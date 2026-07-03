"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { api } from "@/lib/api";
import { DEFAULT_MAP_CENTER, isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps";
import { useGeolocation } from "@/lib/useGeolocation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LocationValue {
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  area: string;
  placeId: string;
  landmark: string;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  error?: string;
  label?: string;
}

async function enrichFromPin(
  lat: number,
  lng: number,
  current: LocationValue,
  placeId?: string,
): Promise<LocationValue> {
  try {
    const geocoded = await api.reverseGeocode(lat, lng);
    return {
      ...current,
      latitude: lat,
      longitude: lng,
      formattedAddress: geocoded.formatted_address,
      area: geocoded.area,
      placeId: placeId ?? current.placeId ?? geocoded.place_id ?? "",
    };
  } catch {
    return {
      ...current,
      latitude: lat,
      longitude: lng,
      formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      area: current.area || "Ololulunga",
      placeId: placeId ?? current.placeId,
    };
  }
}

export function LocationPicker({
  value,
  onChange,
  error,
  label = "Pickup location",
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  const { state: geoState, errorMessage: geoError, requestLocation } = useGeolocation();
  const [coverageMsg, setCoverageMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mapsEnabled = isGoogleMapsConfigured();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  const updatePin = useCallback(async (lat: number, lng: number, placeId?: string) => {
    const next = await enrichFromPin(lat, lng, valueRef.current, placeId);
    onChangeRef.current(next);

    if (markerInstance.current) {
      markerInstance.current.setPosition({ lat, lng });
    }
    if (mapInstance.current) {
      mapInstance.current.panTo({ lat, lng });
    }

    try {
      const res = await api.checkCoverage(lat, lng);
      setCoverageMsg(
        res.in_coverage
          ? "✓ Within our service area"
          : "Outside service area — we may not be able to serve this location",
      );
    } catch {
      setCoverageMsg(null);
    }
  }, []);

  useEffect(() => {
    if (!mapsEnabled || !mapRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const center = {
          lat: value.latitude ?? DEFAULT_MAP_CENTER.lat,
          lng: value.longitude ?? DEFAULT_MAP_CENTER.lng,
        };

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        mapInstance.current = map;

        const marker = new window.google.maps.Marker({
          map,
          position: center,
          draggable: true,
        });
        markerInstance.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          void updatePin(pos.lat(), pos.lng());
        });

        if (searchRef.current && window.google.maps.places) {
          autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
            componentRestrictions: { country: "ke" },
            fields: ["formatted_address", "geometry", "place_id", "name"],
            location: DEFAULT_MAP_CENTER,
            radius: 5000,
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete?.getPlace();
            if (!place?.geometry?.location) return;
            void updatePin(
              place.geometry.location.lat(),
              place.geometry.location.lng(),
              place.place_id,
            );
          });
        }

        setMapReady(true);
      })
      .catch(() => setMapReady(false));

    return () => {
      markerInstance.current?.setMap(null);
      markerInstance.current = null;
      mapInstance.current = null;
      autocomplete = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsEnabled]);

  useEffect(() => {
    if (!mapReady || value.latitude == null || value.longitude == null) return;
    markerInstance.current?.setPosition({ lat: value.latitude, lng: value.longitude });
    mapInstance.current?.panTo({ lat: value.latitude, lng: value.longitude });
  }, [mapReady, value.latitude, value.longitude]);

  const handleUseMyLocation = async () => {
    try {
      const coords = await requestLocation();
      await updatePin(coords.latitude, coords.longitude);
    } catch {
      /* geoError surfaced in UI */
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label required>{label}</Label>
        <p className="mt-1 text-xs text-muted">
          We use your location only to arrange pickup. Drag the pin to your exact gate.
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleUseMyLocation}
        loading={geoState === "loading"}
        loadingText="Getting location"
        overlay={false}
      >
        <Navigation className="h-4 w-4" />
        Use my current location
      </Button>

      {geoError && <p className="text-sm text-amber-400">{geoError}</p>}

      {mapsEnabled ? (
        <>
          <div>
            <Label htmlFor="location-search">Search address (optional)</Label>
            <Input
              ref={searchRef}
              id="location-search"
              placeholder="Search if GPS is unavailable or ordering elsewhere"
              defaultValue=""
            />
          </div>
          <div
            ref={mapRef}
            className="h-[200px] w-full overflow-hidden rounded-xl border border-border bg-surface"
          />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <MapPin className="mb-2 h-5 w-5 text-accent-start" />
          Add <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show the map.
          Use the button above to capture GPS coordinates.
        </div>
      )}

      {mounted && value.formattedAddress && (
        <p className="text-sm text-foreground/90">{value.formattedAddress}</p>
      )}

      {mounted && coverageMsg && (
        <p
          className={`text-xs ${coverageMsg.startsWith("✓") ? "text-emerald-400" : "text-amber-400"}`}
        >
          {coverageMsg}
        </p>
      )}

      <div>
        <Label htmlFor="landmark">Landmark (optional)</Label>
        <Input
          id="landmark"
          placeholder="Blue gate, 2nd house from corner..."
          value={value.landmark}
          onChange={(e) => onChange({ ...value, landmark: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
