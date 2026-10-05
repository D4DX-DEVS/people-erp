import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDragReorder } from "@/hooks/useDragReorder";
import { categoryLabel } from "@/lib/siteProjects";
import { type ProjectPageProject, PROJECT_STATUS_LABELS, PUBLIC_PROJECT_STATUSES } from "@/types/projectPage";

/**
 * A rank the admin can type. Edits are held locally until blur / Enter so a
 * half-typed "1" on the way to "12" does not shuffle the list; the value is
 * clamped into 1…total, and anything that is not a number reverts.
 */
function PositionInput({
  position, total, disabled, onCommit,
}: {
  position: number;
  total: number;
  disabled?: boolean;
  onCommit: (position: number) => void;
}) {
  const [draft, setDraft] = useState(String(position));

  const commit = () => {
    const typed = Math.round(Number(draft));
    if (!draft.trim() || !Number.isFinite(typed)) {
      setDraft(String(position));
      return;
    }
    const next = Math.min(total, Math.max(1, typed));
    setDraft(String(next));
    if (next !== position) onCommit(next);
  };

  return (
    <Input
      inputMode="numeric"
      aria-label="Position on the website"
      title="Type a position and press Enter to move this project there"
      className="h-8 w-14 px-1 text-center font-semibold"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(String(position));
      }}
    />
  );
}

/**
 * The order projects appear in on the public site, top = first. Drag the handle,
 * use the arrows, send a project straight to the top, or type a position.
 *
 * Edits only change the list this component is handed; saving is the parent's
 * job, so the admin can back out without anything having been written.
 */
export function ProjectOrderEditor({
  value, onChange, disabled = false,
}: {
  value: ProjectPageProject[];
  onChange: (next: ProjectPageProject[]) => void;
  disabled?: boolean;
}) {
  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const next = value.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const { dragIndex, handleProps, rowProps, indicator } = useDragReorder(reorder, !disabled);

  return (
    <ol className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
      {value.map((project, i) => {
        const line = indicator(i);
        const isPublic = PUBLIC_PROJECT_STATUSES.includes(project.status || "");
        return (
          <li
            key={project._id}
            {...rowProps(i)}
            className={cn(
              "flex items-center gap-3 bg-card px-3 py-2 transition-opacity",
              !isPublic && "bg-muted/20",
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

            {/* Keyed on the position so the box re-reads it after any move. */}
            <PositionInput
              key={i + 1}
              position={i + 1}
              total={value.length}
              disabled={disabled}
              onCommit={(position) => reorder(i, position - 1)}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {project.category && <Badge variant="outline" className="font-normal capitalize">{categoryLabel(project.category)}</Badge>}
                <Badge variant={isPublic ? "secondary" : "destructive"} className="font-normal">
                  {PROJECT_STATUS_LABELS[project.status || ""] || project.status}
                </Badge>
                {!isPublic && (
                  <span className="text-xs text-muted-foreground">Not shown on the website until approved, active or completed</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move to top" disabled={disabled || i === 0} onClick={() => reorder(i, 0)}>
                <ChevronsUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move up" disabled={disabled || i === 0} onClick={() => reorder(i, i - 1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move down" disabled={disabled || i === value.length - 1} onClick={() => reorder(i, i + 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
