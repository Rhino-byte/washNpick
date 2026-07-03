import { NextResponse } from "next/server";
import { getAdminUploadSecret } from "./config";

export function getProvidedAdminSecret(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const headerSecret = request.headers.get("x-admin-secret")?.trim();
  return bearerToken ?? headerSecret ?? null;
}

export function verifyAdminRequest(request: Request): NextResponse | null {
  const adminSecret = getAdminUploadSecret();
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_SECRET is not configured" },
      { status: 500 },
    );
  }

  const providedSecret = getProvidedAdminSecret(request);
  if (!providedSecret || providedSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
