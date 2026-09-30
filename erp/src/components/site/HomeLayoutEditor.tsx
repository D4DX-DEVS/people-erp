import { useState } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Lock, GripVertical, ChevronDown, ChevronUp, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/site/ColorPicker";
import { cn } from "@/lib/utils";
import { useDragReorder } from "@/hooks/useDragReorder";
import {
  HOME_SECTIONS, HOME_HEADING_FIELDS, resolveHomeLayout,
  type HomeLayoutItem, type HomeHeadingText, type HomeSectionKey,
} from "@/types/siteHome";

interface HomeLayoutEditorProps {
  value: HomeLayoutItem[];
  onChange: (next: HomeLayoutItem[]) => void;
  disabled?: boolean;
}

const DEFS = Object.fromEntries(HOME_SECTIONS.map((d) => [d.key, d]));

/** The three text lines a heading can have, with their colour field and a label. */
const HEADING_ROWS: Array<{ key: keyof HomeHeadingText; color: "eyebrowColor" | "titleColor" | "subtitleColor"; label: string; colorLabel: string }> = [
  { key: "eyebrow", color: "eyebrowColor", label: "Small label (eyebrow)", colorLabel: "Colour" },
  { key: "title", color: "titleColor", label: "Title", colorLabel: "Colour" },
  { key: "subtitle", color: "subtitleColor", label: "Subtitle", colorLabel: "Colour" },
];

/** Does this stored item override any heading copy or colour? */
const hasOverrides = (item: HomeLayoutItem) => HOME_HEADING_FIELDS.some((f) => !!item[f]);

/**
 * Ordered list of home page sections: drag to reorder (or use the arrows), eye
 * to show/hide, and — for sections with a heading — expand to rewrite its
 * eyebrow/title/subtitle and pick a colour for each.
 */
export function HomeLayoutEditor({ value, onChange, disabled = false }: HomeLayoutEditorProps) {
  const [open, setOpen] = useState<Set<HomeSectionKey>>(() => new Set());

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
  const patch = (i: number, p: Partial<HomeLayoutItem>) => onChange(value.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const toggle = (i: number) => patch(i, { visible: !value[i].visible });
  const toggleOpen = (key: HomeSectionKey) =>
    setOpen((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  // "Reset order" puts the sections back in their default order and keeps any
  // heading wording/colours the admin has already written.
  const resetOrder = () =>
    onChange(resolveHomeLayout([]).map((d) => ({ ...d, ...Object.fromEntries(
      HOME_HEADING_FIELDS.map((f) => [f, value.find((v) => v.key === d.key)?.[f] || ""]),
    ) })));

  const { dragIndex, handleProps, rowProps, indicator } = useDragReorder(reorder, !disabled);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Drag the handle to reorder, or use the arrows. The hero banner always comes first and the footer last.
          Sections with nothing to show yet (for example no videos) are skipped automatically. Use the text button
          on a row to change that section's heading and its colours.
        </p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={resetOrder}>
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
          const editable = !!def?.heading;
          const expanded = editable && open.has(item.key);
          const rows = HEADING_ROWS.filter((r) => def?.heading && def.heading[r.key] !== undefined);
          return (
            <li
              key={item.key}
              {...rowProps(i)}
              className={cn(
                "transition-opacity",
                !item.visible && "bg-muted/20 opacity-70",
                dragIndex === i && "opacity-40",
                line === "top" && "shadow-[inset_0_3px_0_0_hsl(var(--primary))]",
                line === "bottom" && "shadow-[inset_0_-3px_0_0_hsl(var(--primary))]",
              )}
            >
              <div className="flex items-center gap-3 px-3 py-2">
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
                    {editable && hasOverrides(item) && <Badge variant="secondary" className="font-normal">Custom heading</Badge>}
                  </div>
                  {def?.description && <p className="text-xs text-muted-foreground">{def.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {editable && (
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      title="Heading text & colours" aria-expanded={expanded}
                      onClick={() => toggleOpen(item.key)}
                    >
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                    </Button>
                  )}
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
              </div>

              {expanded && (
                <div className="space-y-3 border-t border-border/60 bg-muted/20 px-3 py-3 pl-[4.25rem]">
                  {rows.map((row) => {
                    // A two-tone title gets a second picker for its accented last word.
                    const twoTone = row.key === "title" && def?.accent;
                    return (
                      <div key={row.key} className={cn("grid gap-2", twoTone ? "sm:grid-cols-[1fr_180px_180px]" : "sm:grid-cols-[1fr_180px]")}>
                        <div className="space-y-1">
                          <Label className="text-xs">{row.label}</Label>
                          <Input
                            value={item[row.key] || ""}
                            placeholder={def?.heading?.[row.key] || ""}
                            disabled={disabled}
                            onChange={(e) => patch(i, { [row.key]: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{twoTone ? "First words colour" : row.colorLabel}</Label>
                          <ColorPicker
                            value={item[row.color]}
                            defaultLabel="Default"
                            disabled={disabled}
                            onChange={(v) => patch(i, { [row.color]: v })}
                          />
                        </div>
                        {twoTone && (
                          <div className="space-y-1">
                            <Label className="text-xs">Last word colour</Label>
                            <ColorPicker
                              value={item.accentColor}
                              defaultLabel="Brand"
                              disabled={disabled}
                              onChange={(v) => patch(i, { accentColor: v })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {def?.divider && (
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                      <div className="space-y-1 self-end">
                        <Label className="text-xs">Divider</Label>
                        <p className="text-xs text-muted-foreground">The short rule with a diamond drawn under the heading.</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Colour</Label>
                        <ColorPicker
                          value={item.dividerColor}
                          defaultLabel="Brand"
                          disabled={disabled}
                          onChange={(v) => patch(i, { dividerColor: v })}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave a field blank to keep the built-in wording shown as its placeholder.
                    {item.key === "about" && " The About title itself is set in the About Us section below."}
                  </p>
                  <Button
                    type="button" variant="ghost" size="sm" disabled={disabled || !hasOverrides(item)}
                    onClick={() => patch(i, Object.fromEntries(HOME_HEADING_FIELDS.map((f) => [f, ""])))}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Use defaults
                  </Button>
                </div>
              )}
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
