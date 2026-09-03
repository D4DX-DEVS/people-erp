import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLOR_SWATCHES, colorLabel, colorValue, hexToRgb, isHex } from "@/lib/siteColors";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  /** Swatch name, hex, or empty (= inherit). */
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Show an inherit option that clears the value. */
  allowDefault?: boolean;
  /** What "no colour" means here, e.g. "Brand colour" or "Section colour". */
  defaultLabel?: string;
  className?: string;
}

const toSixHex = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#0284c7";
  return "#" + [rgb.r, rgb.g, rgb.b].map((n) => n.toString(16).padStart(2, "0")).join("");
};

/** Named swatches plus a free custom colour, shown in a compact popover. */
export function ColorPicker({ value, onChange, disabled, allowDefault = true, defaultLabel = "Default", className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const isCustom = !!value && !COLOR_SWATCHES.some((s) => s.value === value);

  const commitHex = (raw: string) => {
    const t = raw.trim();
    if (isHex(t)) onChange(t.toLowerCase());
    setHexDraft(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn("w-full justify-between font-normal", className)}>
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "h-5 w-5 shrink-0 rounded-full border border-black/10",
                !value && "bg-[conic-gradient(from_0deg,#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)] opacity-70",
              )}
              style={value ? { backgroundColor: colorValue(value) } : undefined}
            />
            <span className="truncate">{colorLabel(value, defaultLabel)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        {allowDefault && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", !value && "bg-muted")}
          >
            <span className="h-5 w-5 rounded-full border border-dashed border-border" />
            {defaultLabel}
          </button>
        )}
        <div className="grid grid-cols-6 gap-2">
          {COLOR_SWATCHES.map((s) => (
            <button
              key={s.value}
              type="button"
              title={s.label}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110",
                value === s.value && "ring-2 ring-foreground/40 ring-offset-2",
              )}
              style={{ backgroundColor: colorValue(s.value) }}
            >
              {value === s.value && <Check className="h-4 w-4 text-white drop-shadow" />}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Custom colour</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick a custom colour"
              value={isCustom && isHex(value) ? toSixHex(value!) : "#0284c7"}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
            />
            <Input
              value={hexDraft ?? (isCustom ? value : "")}
              placeholder="#0f766e"
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitHex((e.target as HTMLInputElement).value); }}
              className="font-mono text-xs uppercase"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
