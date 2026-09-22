import { useEffect, useState } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { useOrgLogos } from "@/hooks/useOrgLogoUrl";
import bundledLogo from "@/assets/logo.png";
import bundledFooterLogo from "@/assets/footer-logo.png";

type BrandVariant = "primary" | "footer";

interface BrandMarkProps {
  /** "footer" picks the light-on-dark lockup, which the dark footer band needs. */
  variant?: BrandVariant;
  className?: string;
  alt?: string;
}

/**
 * The franchise's own logo.
 *
 * The mark used to be a bundled import, so every franchise served by the same
 * build showed the same logo no matter which one the visitor was actually on.
 * It now comes from the franchise record (admins upload it under
 * Settings → Organization, or the platform admin sets it per franchise), with
 * the bundled asset kept as the fallback for a franchise that has not uploaded
 * one yet and for an upload URL that fails to load.
 */
export function BrandMark({ variant = "primary", className, alt }: BrandMarkProps) {
  const { org } = useConfig();
  const logos = useOrgLogos();

  const fallback = variant === "footer" ? bundledFooterLogo : bundledLogo;
  const src = (variant === "footer" ? logos.footer : logos.primary) || fallback;

  // A broken URL — a logo deleted straight out of the bucket, say — must not
  // leave the header with no brand at all.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <img
      src={failed ? fallback : src}
      alt={alt ?? (org.displayName || org.erpTitle)}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
