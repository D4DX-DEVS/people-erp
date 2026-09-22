import { useLayoutEffect, useRef, useState } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  /** null is the "All" option. */
  value: string | null;
}

/** Matches the gap-2 between chips, in px — used to measure, not to style. */
const GAP = 8;
/** Width reserved for the overflow trigger plus its gap: an h-8 w-8 button. */
const MORE_WIDTH = 32 + GAP;

/**
 * A single row of filter chips that never wraps: whatever does not fit at the
 * current width moves into a "…" dropdown at the end of the row.
 *
 * The split is measured rather than driven by a breakpoint, because what fits
 * depends on the labels as much as the viewport — eight category names wrap on
 * a phone at one set of labels and not at another. An off-screen copy of the
 * full row supplies the natural widths; a ResizeObserver redoes the sum when
 * the container changes size.
 */
export function FilterChips({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(options.length);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;

    const recompute = () => {
      const chips = Array.from(measure.children) as HTMLElement[];
      const available = row.clientWidth;
      let used = 0;
      let count = 0;
      for (let i = 0; i < chips.length; i += 1) {
        const width = chips[i].offsetWidth + (i > 0 ? GAP : 0);
        // Everything but the final chip has to leave room for the trigger,
        // since anything it pushes out is what the trigger exists to hold.
        const reserve = i < chips.length - 1 ? MORE_WIDTH : 0;
        if (used + width + reserve > available) break;
        used += width;
        count += 1;
      }
      // One chip always stays on the row, even at absurd widths — a lone "…"
      // with nothing beside it reads as a broken control.
      setVisibleCount(Math.max(1, count));
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(row);
    return () => observer.disconnect();
  }, [options]);

  const visible = options.slice(0, visibleCount);
  const overflow = options.slice(visibleCount);
  // The selected filter may have been pushed into the dropdown; the trigger
  // then carries the active styling so the row still shows something is on.
  const activeInOverflow = overflow.some((o) => o.value === value);

  const chipClass = "shrink-0 rounded-full";

  return (
    <div ref={rowRef} className={cn("relative flex items-center justify-center gap-2 overflow-hidden", className)}>
      {/* Off-screen copy at natural width. It is the only thing that knows how
          wide each chip wants to be — the visible row is already truncated. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-2"
      >
        {options.map((o) => (
          <Button key={String(o.value)} variant="outline" size="sm" className={chipClass} tabIndex={-1}>
            {o.label}
          </Button>
        ))}
      </div>

      {visible.map((o) => (
        <Button
          key={String(o.value)}
          variant={value === o.value ? "default" : "outline"}
          size="sm"
          className={chipClass}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeInOverflow ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full p-0"
              aria-label={`More filters (${overflow.length})`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            {overflow.map((o) => (
              <DropdownMenuItem key={String(o.value)} onSelect={() => onChange(o.value)} className="gap-2">
                <Check className={cn("h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
