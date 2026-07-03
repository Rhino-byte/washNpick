import { getCloudName, getFallbackPublicId } from "./config";

export interface CloudinaryUrlOptions {
  width?: number;
  quality?: "auto" | number;
  cacheBust?: string | number;
}

export function getCloudinaryUrl(
  publicId: string,
  options: CloudinaryUrlOptions = {},
): string {
  const cloudName = getCloudName();
  if (!cloudName) return "";

  const { width = 480, quality = "auto", cacheBust } = options;
  const transforms = [`f_auto`, `q_${quality}`, `w_${width}`].join(",");

  let url = `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;

  if (cacheBust !== undefined) {
    url += `?t=${cacheBust}`;
  }

  return url;
}

export function getFallbackCloudinaryUrl(
  options: CloudinaryUrlOptions = {},
): string {
  const fallbackId = getFallbackPublicId();
  if (!fallbackId) return "";
  return getCloudinaryUrl(fallbackId, options);
}

export function splitPublicId(publicId: string): {
  folder: string;
  id: string;
} {
  const parts = publicId.split("/");
  const folder = parts[0];
  const id = parts.slice(1).join("/");
  return { folder, id };
}
