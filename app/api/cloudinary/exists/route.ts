import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getCloudinaryServerConfig } from "@/lib/cloudinary/config";
import { isAllowedPublicId } from "@/lib/site-images";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const serverConfig = getCloudinaryServerConfig();
  if (!serverConfig) {
    return NextResponse.json(
      { error: "Cloudinary server credentials are not configured", exists: false },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId")?.trim();

  if (!publicId) {
    return NextResponse.json({ error: "publicId is required", exists: false }, { status: 400 });
  }

  if (!isAllowedPublicId(publicId)) {
    return NextResponse.json({ error: "Invalid publicId", exists: false }, { status: 400 });
  }

  cloudinary.config(serverConfig);

  try {
    await cloudinary.api.resource(publicId, { resource_type: "image" });
    return NextResponse.json({ exists: true, publicId });
  } catch {
    return NextResponse.json({ exists: false, publicId });
  }
}
