"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isCloudinaryConfigured,
  isDevFallbackEnabled,
} from "@/lib/cloudinary/config";
import {
  getCloudinaryUrl,
  getFallbackCloudinaryUrl,
} from "@/lib/cloudinary/url";
import type { SiteImage } from "@/lib/site-images";

type AspectRatio = "video" | "square" | "wide" | "banner" | "portrait";

const aspectClasses: Record<AspectRatio, string> = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[16/9]",
  banner: "aspect-[21/9]",
  portrait: "aspect-[4/5]",
};

interface ImageSlotProps {
  image: SiteImage;
  aspect?: AspectRatio;
  className?: string;
  rounded?: "lg" | "xl" | "2xl" | "none";
  priority?: boolean;
  overlay?: boolean;
  cacheBust?: string | number;
  /** Skip exists check — use after a successful admin upload */
  forceExists?: boolean;
}

function ImagePlaceholder({
  image,
  aspect,
  roundedClass,
  className,
  hint,
}: {
  image: SiteImage;
  aspect: AspectRatio;
  roundedClass: string;
  className?: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden border border-dashed border-border bg-gradient-to-br from-surface to-surface-elevated",
        aspectClasses[aspect],
        roundedClass,
        className,
      )}
      role="img"
      aria-label={image.alt}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated">
          <ImageIcon className="h-5 w-5 text-muted" />
        </div>
        <p className="text-xs font-medium text-muted">Image slot</p>
        <p className="font-mono text-[11px] text-accent-start">{image.publicId}</p>
        {hint && <p className="text-[10px] text-muted">{hint}</p>}
        {!isCloudinaryConfigured() && (
          <p className="text-[10px] text-muted">Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</p>
        )}
      </div>
    </div>
  );
}

function ImageSlotInner({
  image,
  aspect = "video",
  className,
  rounded = "2xl",
  priority = false,
  overlay = false,
  cacheBust,
  forceExists = false,
}: ImageSlotProps) {
  const skipExistsGate = forceExists || priority;

  const [fetchedExists, setFetchedExists] = useState<boolean | null>(
    skipExistsGate ? true : null,
  );
  const [loadFailed, setLoadFailed] = useState(false);

  const assetExists = skipExistsGate || fetchedExists === true;

  const roundedClass = {
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    none: "rounded-none",
  }[rounded];

  useEffect(() => {
    if (skipExistsGate || !isCloudinaryConfigured()) {
      return;
    }

    let cancelled = false;

    async function checkExists() {
      try {
        const res = await fetch(
          `/api/cloudinary/exists?publicId=${encodeURIComponent(image.publicId)}`,
        );
        const data = (await res.json()) as { exists?: boolean };
        if (!cancelled) {
          setFetchedExists(Boolean(data.exists));
        }
      } catch {
        if (!cancelled) setFetchedExists(false);
      }
    }

    void checkExists();

    return () => {
      cancelled = true;
    };
  }, [image.publicId, skipExistsGate]);

  if (!isCloudinaryConfigured()) {
    return (
      <ImagePlaceholder
        image={image}
        aspect={aspect}
        roundedClass={roundedClass}
        className={className}
      />
    );
  }

  if (!skipExistsGate && fetchedExists === null) {
    return (
      <div
        className={cn(
          "relative animate-pulse bg-surface",
          aspectClasses[aspect],
          roundedClass,
          className,
        )}
      />
    );
  }

  const primarySrc = assetExists
    ? getCloudinaryUrl(image.publicId, { cacheBust })
    : "";

  const fallbackSrc =
    !assetExists && isDevFallbackEnabled() ? getFallbackCloudinaryUrl({ cacheBust }) : "";

  const displaySrc = primarySrc || fallbackSrc;
  const usingFallback = !assetExists && Boolean(fallbackSrc);

  if (!displaySrc || loadFailed) {
    return (
      <ImagePlaceholder
        image={image}
        aspect={aspect}
        roundedClass={roundedClass}
        className={className}
        hint={
          fetchedExists === false && !skipExistsGate
            ? "Upload at /admin/media"
            : undefined
        }
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface",
        aspectClasses[aspect],
        roundedClass,
        className,
      )}
    >
      <Image
        src={displaySrc}
        alt={usingFallback ? `${image.alt} (dev placeholder)` : image.alt}
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "low"}
        className="object-cover"
        sizes="(max-width: 480px) 100vw, 480px"
        onError={() => setLoadFailed(true)}
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      )}
      {usingFallback && (
        <div className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] text-muted">
          Dev fallback
        </div>
      )}
    </div>
  );
}

export function ImageSlot(props: ImageSlotProps) {
  const remountKey = `${props.image.publicId}-${props.cacheBust ?? ""}-${props.forceExists ?? false}-${props.priority ?? false}`;

  return <ImageSlotInner key={remountKey} {...props} />;
}
