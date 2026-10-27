import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { projectPages } from "@/lib/api";
import { ChecklistPicker, type ChecklistOption } from "@/components/site/ChecklistPicker";
import { PROJECT_STATUS_LABELS, PUBLIC_PROJECT_STATUSES, type ProjectPageRow } from "@/types/projectPage";

/**
 * "List this on project pages?" — a switch plus the projects to list it on.
 * Shared by the Brochure and Testimonial forms; the public project page
 * (/projects-hub/:slug) shows every active item linked to its project.
 */
export function ProjectLinksField({
  enabled, projects, onChange, disabled, itemLabel,
}: {
  enabled: boolean;
  projects: string[];
  onChange: (next: { enabled: boolean; projects: string[] }) => void;
  disabled?: boolean;
  /** "brochure", "testimonial" — used in the helper copy. */
  itemLabel: string;
}) {
  const [options, setOptions] = useState<ChecklistOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || options.length) return;
    let alive = true;
    setLoading(true);
    projectPages.getAll()
      .then((res: any) => {
        if (!alive) return;
        const rows: ProjectPageRow[] = res?.data || [];
        setOptions(rows.map(({ project, page }) => {
          const isPublic = PUBLIC_PROJECT_STATUSES.includes(project.status || "");
          const status = PROJECT_STATUS_LABELS[project.status || ""] || project.status || "";
          return {
            value: project._id,
            label: project.name,
            hint: [
              status,
              isPublic ? (page?.status === "published" ? "page published" : "default page") : "hidden on website",
            ].filter(Boolean).join(" · "),
          };
        }));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [enabled, options.length]);

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm">List on project pages</Label>
          <p className="text-xs text-muted-foreground">
            Show this {itemLabel} on the public page of selected projects, as well as in its usual place.
          </p>
        </div>
        <Switch disabled={disabled} checked={enabled} onCheckedChange={(v) => onChange({ enabled: v, projects })} />
      </div>
      {enabled && (
        <div className="space-y-1.5">
          <Label className="text-xs">Project pages</Label>
          <ChecklistPicker
            options={options}
            value={projects}
            loading={loading}
            disabled={disabled}
            searchPlaceholder="Search projects…"
            emptyText="No projects yet — add them under Projects."
            onChange={(next) => onChange({ enabled, projects: next })}
          />
          {!projects.length && (
            <p className="text-xs text-amber-600">Pick at least one project, or turn this off.</p>
          )}
        </div>
      )}
    </div>
  );
}
