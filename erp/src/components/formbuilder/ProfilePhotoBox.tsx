import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePhotoBoxProps {
  src?: string | null;
  alt?: string;
  placeholder?: string;
  className?: string;
}

/** Passport-size (35×45) photo frame shown at the top right of an application */
export function ProfilePhotoBox({ src, alt = "Profile photo", placeholder = "No photo", className }: ProfilePhotoBoxProps) {
  return (
    <div className={cn("flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50", className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
          <UserRound className="h-6 w-6" />
          <span>{placeholder}</span>
        </div>
      )}
    </div>
  );
}

/** Image source for a stored upload value: CDN URL string or inline data-URL object */
export function photoSrc(value: unknown): string | undefined {
  if (typeof value === "string" && value.startsWith("http")) return value;
  const dataUrl = (value as { dataUrl?: unknown } | null)?.dataUrl;
  return typeof dataUrl === "string" ? dataUrl : undefined;
}

/** Every enabled profile-photo field in a form config, in page order */
export function profilePhotoFields(formConfig: any): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const page of formConfig?.pages || []) {
    const fields = [...(page.fields || []), ...(page.sections || []).flatMap((s: any) => s.fields || [])];
    for (const f of fields) {
      if (f && f.enabled !== false && f.type === "profile_photo") {
        out.push({ key: `field_${f.id}`, label: f.label || "Profile Photo" });
      }
    }
  }
  return out;
}
