function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function getCloudName(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(getCloudName());
}

export function requireCloudName(): string {
  const cloudName = getCloudName();
  if (!cloudName) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. Add it to your .env.local file.",
    );
  }
  return cloudName;
}

export function getCloudinaryServerConfig() {
  const cloud_name = getCloudName();
  const api_key = trimEnv(process.env.CLOUDINARY_API_KEY);
  const api_secret = trimEnv(process.env.CLOUDINARY_API_SECRET);

  if (!cloud_name || !api_key || !api_secret) {
    return null;
  }

  return { cloud_name, api_key, api_secret };
}

export function getAdminUploadSecret(): string | undefined {
  return trimEnv(process.env.ADMIN_UPLOAD_SECRET);
}

export function getFallbackPublicId(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_CLOUDINARY_FALLBACK_PUBLIC_ID);
}

export function isDevFallbackEnabled(): boolean {
  return process.env.NODE_ENV === "development" && Boolean(getFallbackPublicId());
}
