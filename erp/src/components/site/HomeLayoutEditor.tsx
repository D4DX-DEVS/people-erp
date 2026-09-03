import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Lock, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDragReorder } from "@/hooks/useDragReorder";
import { HOME_SECTIONS, resolveHomeLayout, type HomeLayoutItem } from "@/types/siteHome";

interface HomeLayoutEditorProps {
  value: HomeLayoutItem[];
  onChange: (next: HomeLayoutItem[]) => void;
  disabled?: boolean;
}

const DEFS = Object.fromEntries(HOME_SECTIONS.map((d) => [d.key, d]));

/** Ordered list of home page sections: drag to reorder (or use the arrows), eye to show/hide. */
export function HomeLayoutEditor({ value, onChange, disabled = false }: HomeLayoutEditorProps) {
  const reorder = (from: number, to: number) => {
    const next = value.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    reorder(i, j);
  };
  const toggle = (i: number) => onChange(value.map((it, k) => (k === i ? { ...it, visible: !it.visible } : it)));

  const { dragIndex, handleProps, rowProps, indicator } = useDragReorder(reorder, !disabled);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Drag the handle to reorder, or use the arrows. The hero banner always comes first and the footer last.
          Sections with nothing to show yet (for example no videos) are skipped automatically.
        </p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(resolveHomeLayout([]))}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset order
        </Button>
      </div>

      <ol className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
        <li className="flex items-center gap-3 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Hero banner — always first</span>
        </li>
        {value.map((item, i) => {
          const def = DEFS[item.key];
          const line = indicator(i);
          return (
            <li
              key={item.key}
              {...rowProps(i)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-opacity",
                !item.visible && "bg-muted/20 opacity-70",
                dragIndex === i && "opacity-40",
                line === "top" && "shadow-[inset_0_3px_0_0_hsl(var(--primary))]",
                line === "bottom" && "shadow-[inset_0_-3px_0_0_hsl(var(--primary))]",
              )}
            >
              <span
                {...handleProps(i)}
                title="Drag to reorder"
                aria-label="Drag to reorder"
                className={cn(
                  "flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted-foreground",
                  disabled ? "opacity-40" : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
                )}
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{def?.label || item.key}</span>
                  {!item.visible && <Badge variant="outline" className="font-normal">Hidden</Badge>}
                </div>
                {def?.description && <p className="text-xs text-muted-foreground">{def.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7"
                  title={item.visible ? "Hide this section" : "Show this section"}
                  disabled={disabled} onClick={() => toggle(i)}
                >
                  {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move up" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move down" disabled={disabled || i === value.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
        <li className="flex items-center gap-3 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Footer — always last</span>
        </li>
      </ol>
    </div>
  );
}
