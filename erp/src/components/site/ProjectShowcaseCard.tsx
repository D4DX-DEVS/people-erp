import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabel, projectImage, projectPath, type PublicProject } from "@/lib/siteProjects";
import { resolveIcon } from "@/lib/siteIcons";
import { depthForIndex, useParallax, useTilt } from "@/hooks/useParallax";

// Category → icon shown in the small circular badge that overlaps the image.
const CATEGORY_ICON: Record<string, string> = {
  education: "graduation-cap",
  healthcare: "stethoscope",
  housing: "home",
  livelihood: "briefcase",
  emergency_relief: "life-buoy",
  infrastructure: "hammer",
  social_welfare: "hand-heart",
  other: "sparkles",
};

// Category → overlay pill color, shown at the top-left of the image.
const CATEGORY_TINT: Record<string, string> = {
  education: "bg-violet-600",
  healthcare: "bg-rose-600",
  housing: "bg-amber-600",
  livelihood: "bg-sky-600",
  emergency_relief: "bg-red-600",
  infrastructure: "bg-slate-600",
  social_welfare: "bg-emerald-600",
  other: "bg-primary",
};

/**
 * Image-first project tile used on the homepage "Our Projects" section.
 *
 * The card reads as three planes: the photo drifts against the page scroll, the
 * body sits on the card face, and the category pill and icon badge float above
 * both while the card tips towards the pointer. `index` picks the drift rate so
 * neighbouring cards never move together — that difference is the effect.
 */
export function ProjectShowcaseCard({ project, index = 0 }: { project: PublicProject; index?: number }) {
  const navigate = useNavigate();
  const path = projectPath(project);
  const Icon = resolveIcon(CATEGORY_ICON[project.category || "other"]);
  const tiltRef = useTilt<HTMLDivElement>();
  const imageRef = useParallax<HTMLDivElement>(depthForIndex(index));

  return (
    <div
      ref={tiltRef}
      className={cn("tilt-card group flex h-full flex-col", path && "cursor-pointer")}
      onClick={path ? () => navigate(path) : undefined}
      role={path ? "link" : undefined}
      tabIndex={path ? 0 : undefined}
      onKeyDown={path ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(path); } } : undefined}
    >
      <div className="relative pb-7">
        <div className="parallax-frame relative h-44 overflow-hidden rounded-2xl shadow-sm">
          {/* The drift and the hover zoom live on separate nodes: both are
              transforms, and sharing one node would make the zoom's transition
              lag the scroll. */}
          <div ref={imageRef} className="parallax-media">
            <img
              src={projectImage(project)}
              alt={project.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {/* Deepens the photo behind the pill so the label keeps its contrast
              whatever the franchise has uploaded. */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />
        </div>
        {project.category && (
          <span className={cn("tilt-layer absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow", CATEGORY_TINT[project.category] || CATEGORY_TINT.other)}>
            {categoryLabel(project.category)}
          </span>
        )}
        <div className="tilt-layer absolute -bottom-1 left-5 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-background bg-primary text-primary-foreground shadow-md">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-card p-5 pt-2 transition-shadow duration-300 group-hover:shadow-xl">
        <h3 className="text-base font-semibold leading-snug">{project.name}</h3>
        {project.description && <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
        {path && (
          <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
            Learn More
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        )}
      </div>
    </div>
  );
}
