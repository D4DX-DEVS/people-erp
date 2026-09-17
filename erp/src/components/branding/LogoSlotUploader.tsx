import { useRef, useState } from "react";
import { Upload, Trash2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LogoVariant } from "@/lib/api";

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp",
  "image/x-icon", "image/vnd.microsoft.icon",
];
const ACCEPT_ATTR = "image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/x-icon";
const MAX_BYTES = 2 * 1024 * 1024;

export interface LogoSlotUploaderProps {
  variant: LogoVariant;
  title: string;
  description: string;
  /** The mark currently stored for this slot; empty means "still on the default". */
  currentUrl?: string;
  /** Preview on a dark plate — the footer lockup is light-on-dark and vanishes otherwise. */
  darkPreview?: boolean;
  disabled?: boolean;
  onUpload: (file: File, variant: LogoVariant) => Promise<void>;
  onRemove?: (variant: LogoVariant) => Promise<void>;
}

/**
 * One branding slot: preview, file picker, upload and remove.
 *
 * Used by both admin surfaces — a franchise admin setting their own logos in
 * Settings, and the platform admin setting them for any franchise.
 */
export function LogoSlotUploader({
  variant,
  title,
  description,
  currentUrl,
  darkPreview = false,
  disabled = false,
  onUpload,
  onRemove,
}: LogoSlotUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPG, SVG, WebP and ICO images are allowed");
      reset();
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 2MB");
      reset();
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please choose an image first");
      return;
    }
    setBusy(true);
    try {
      await onUpload(file, variant);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setBusy(true);
    try {
      await onRemove(variant);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || currentUrl;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <div
        className={cn(
          "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-2",
          darkPreview && "bg-gradient-hero border-white/25",
        )}
      >
        {shown ? (
          <img src={shown} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {!currentUrl && (
          <p className="text-xs text-muted-foreground italic">
            Not set — the built-in default is being used.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleSelect}
            disabled={disabled || busy}
            className="h-9 max-w-xs text-xs"
          />
          {preview && (
            <Button size="sm" onClick={handleUpload} disabled={disabled || busy}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Uploading..." : "Save"}
            </Button>
          )}
          {!preview && currentUrl && onRemove && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={disabled || busy}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Slot definitions shared by every branding UI, so the wording stays in one place. */
export const LOGO_SLOTS: Array<{
  variant: LogoVariant;
  title: string;
  description: string;
  darkPreview?: boolean;
}> = [
  {
    variant: "primary",
    title: "Primary logo",
    description: "Site header, login screen and ERP shell. Recommended: transparent PNG/SVG, at least 256px tall.",
  },
  {
    variant: "footer",
    title: "Footer logo",
    description: "Shown on the dark footer band. Use the light-on-dark version of the mark; falls back to the primary logo.",
    darkPreview: true,
  },
  {
    variant: "favicon",
    title: "Favicon",
    description: "Browser tab icon. Square works best (32×32 or 64×64); falls back to the primary logo.",
  },
];
