import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/cloudinary/auth";
import { getCloudinaryServerConfig } from "@/lib/cloudinary/config";
import { splitPublicId } from "@/lib/cloudinary/url";
import { isAllowedPublicId } from "@/lib/site-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = verifyAdminRequest(request);
  if (authError) return authError;

  const serverConfig = getCloudinaryServerConfig();
  if (!serverConfig) {
    return NextResponse.json(
      { error: "Cloudinary server credentials are not configured" },
      { status: 500 },
    );
  }

  cloudinary.config(serverConfig);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const publicId = formData.get("publicId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (typeof publicId !== "string" || !publicId.trim()) {
    return NextResponse.json({ error: "publicId is required" }, { status: 400 });
  }

  const normalizedPublicId = publicId.trim();

  if (!isAllowedPublicId(normalizedPublicId)) {
    return NextResponse.json({ error: "Invalid publicId" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 400 },
    );
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return NextResponse.json(
      { error: "File must be 10MB or smaller" },
      { status: 400 },
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const { folder, id } = splitPublicId(normalizedPublicId);

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: id,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    });

    return NextResponse.json({
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
