export const DEFAULT_MAP_CENTER = { lat: -0.75, lng: 35.25 };

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(mapsKey);
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (!mapsKey) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
    script.async = true;
    script.dataset.googleMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}
