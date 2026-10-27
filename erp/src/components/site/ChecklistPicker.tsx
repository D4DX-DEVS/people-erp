import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChecklistOption {
  value: string;
  label: string;
  /** Second line under the label (status, category…). */
  hint?: string;
  /** Small thumbnail shown before the label (logos, covers). */
  imageUrl?: string;
}

/**
 * Searchable multi-select rendered inline as a checkbox list — no popover, so
 * it behaves inside dialogs. Selected values keep the order they were picked
 * in, which is the display order wherever the selection is rendered.
 */
export function ChecklistPicker({
  options, value, onChange, disabled, loading, searchPlaceholder = "Search…", emptyText = "Nothing to choose from yet.",
}: {
  options: ChecklistOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint || ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (v: string) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="rounded-lg border border-input">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/60 p-2">
          {value.map((v) => (
            <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary">
              <span className="truncate">{byValue.get(v)?.label || "Unavailable item"}</span>
              {!disabled && (
                <button type="button" className="rounded-full p-0.5 hover:bg-primary/20" onClick={() => toggle(v)} aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {options.length > 6 && (
        <div className="relative border-b border-border/60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 rounded-none border-0 pl-8 shadow-none focus-visible:ring-0"
          />
        </div>
      )}
      <div className="max-h-56 overflow-y-auto p-1">
        {loading ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{options.length ? "No matches." : emptyText}</p>
        ) : (
          filtered.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Checkbox checked={selected.has(o.value)} disabled={disabled} onCheckedChange={() => toggle(o.value)} />
              {o.imageUrl && <img src={o.imageUrl} alt="" className="h-7 w-10 shrink-0 rounded object-contain" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
