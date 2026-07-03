export {};

declare global {
  namespace google {
    namespace maps {
      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      class Map {
        constructor(element: HTMLElement, opts?: Record<string, unknown>);
        setCenter(latLng: LatLng | { lat: number; lng: number }): void;
        panTo(latLng: LatLng | { lat: number; lng: number }): void;
      }

      class Marker {
        constructor(opts?: Record<string, unknown>);
        setPosition(latLng: LatLng | { lat: number; lng: number }): void;
        getPosition(): LatLng | null | undefined;
        setMap(map: Map | null): void;
        addListener(event: string, handler: () => void): void;
      }

      namespace places {
        interface PlaceResult {
          formatted_address?: string;
          place_id?: string;
          name?: string;
          geometry?: {
            location: {
              lat: () => number;
              lng: () => number;
            };
          };
        }
        class Autocomplete {
          constructor(
            input: HTMLInputElement,
            opts?: {
              componentRestrictions?: { country: string };
              fields?: string[];
              location?: { lat: number; lng: number };
              radius?: number;
            },
          );
          addListener(event: string, handler: () => void): void;
          getPlace(): PlaceResult;
        }
      }
    }
  }

  interface Window {
    google?: {
      maps?: {
        Map: typeof google.maps.Map;
        Marker: typeof google.maps.Marker;
        LatLng: typeof google.maps.LatLng;
        places?: {
          Autocomplete: typeof google.maps.places.Autocomplete;
        };
      };
    };
  }
}
