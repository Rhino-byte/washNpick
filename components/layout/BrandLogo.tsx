import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

const { logoSrc, logoAlt, logoWidth, logoHeight } = siteConfig.brand;
const logoAspect = logoWidth / logoHeight;

interface BrandLogoProps {
  height?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  height = 40,
  className,
  priority,
}: BrandLogoProps) {
  const width = Math.round(height * logoAspect);

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={width}
        height={height}
        className="rounded-md object-contain"
        style={{ width: "auto", height: `${height}px`, maxWidth: width }}
        priority={priority}
      />
    </span>
  );
}
