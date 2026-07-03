import type { User as FirebaseUser } from "firebase/auth";
import type { ApiUserProfile } from "@/lib/api";
import type { OrderFormData } from "@/lib/order-types";

export function parseGoogleDisplayName(displayName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!displayName?.trim()) {
    return { firstName: "", lastName: "" };
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function getDisplayFirstName(
  profile: ApiUserProfile | null,
  firebaseUser: FirebaseUser | null,
): string {
  if (profile?.first_name) return profile.first_name;
  if (firebaseUser?.displayName) {
    return parseGoogleDisplayName(firebaseUser.displayName).firstName;
  }
  return "";
}

export function buildFormPrefill(
  profile: ApiUserProfile,
  firebaseUser: FirebaseUser | null,
): Partial<OrderFormData> {
  const fromGoogle = parseGoogleDisplayName(firebaseUser?.displayName);
  const addr = profile.default_address;

  return {
    firstName: profile.first_name ?? fromGoogle.firstName,
    lastName: profile.last_name ?? fromGoogle.lastName,
    phone: profile.phone ?? "",
    email: profile.email,
    area: addr?.area ?? "",
    landmark: addr?.address_line ?? "",
    formattedAddress: addr?.formatted_address ?? "",
    placeId: addr?.place_id ?? "",
    latitude: addr?.latitude != null ? Number(addr.latitude) : null,
    longitude: addr?.longitude != null ? Number(addr.longitude) : null,
    paymentMethod: profile.is_burned ? "mpesa" : undefined,
  };
}

export function getInitials(
  profile: ApiUserProfile | null,
  firebaseUser: FirebaseUser | null,
): string {
  const first = profile?.first_name || parseGoogleDisplayName(firebaseUser?.displayName).firstName;
  const last = profile?.last_name || parseGoogleDisplayName(firebaseUser?.displayName).lastName;
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  return (a + b) || "?";
}
