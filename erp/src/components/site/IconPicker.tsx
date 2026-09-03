import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SITE_ICON_GROUPS, findSiteIcon } from "@/lib/siteIcons";
import { iconBadgeStyle } from "@/lib/siteColors";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value?: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  /** Offer a "No icon" choice that clears the value. */
  allowNone?: boolean;
  /** Colour used to preview the chosen icon in the trigger. */
  color?: string;
  /** Trigger text while nothing is chosen. */
  placeholder?: string;
  className?: string;
}

/** Searchable, grouped picker over the curated Lucide icon set. */
export function IconPicker({ value, onChange, disabled, allowNone = true, color, placeholder = "No icon", className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = findSiteIcon(value);
  const CurrentIcon = current?.Icon;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SITE_ICON_GROUPS;
    return SITE_ICON_GROUPS
      .map((g) => ({
        ...g,
        icons: g.icons.filter((i) => `${i.name} ${i.label} ${i.keywords || ""} ${g.label}`.toLowerCase().includes(q)),
      }))
      .filter((g) => g.icons.length > 0);
  }, [query]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn("w-full justify-between font-normal", className)}>
          <span className="flex min-w-0 items-center gap-2">
            {CurrentIcon ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={iconBadgeStyle(color)}>
                <CurrentIcon className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                <X className="h-3 w-3" />
              </span>
            )}
            <span className="truncate">{current ? current.label : value || placeholder}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <div className="border-b border-border/60 p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: water, school, health…"
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto p-2">
          {allowNone && !query && (
            <button
              type="button"
              onClick={() => pick("")}
              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", !value && "bg-muted")}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </span>
              No icon
            </button>
          )}
          {groups.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No icons match “{query}”.</p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {g.icons.map(({ name, label, Icon }) => (
                  <button
                    key={name}
                    type="button"
                    title={label}
                    onClick={() => pick(name)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                      value === name && "bg-primary/10 text-primary ring-2 ring-primary/40",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
