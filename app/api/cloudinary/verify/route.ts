import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/cloudinary/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = verifyAdminRequest(request);
  if (authError) return authError;

  return NextResponse.json({ ok: true });
}
