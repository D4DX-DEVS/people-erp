import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabel, projectImage, projectPath, type PublicProject } from "@/lib/siteProjects";
import { resolveIcon } from "@/lib/siteIcons";
import { Reveal } from "@/components/site/Reveal";
import { useTilt } from "@/hooks/useParallax";

// Category → icon shown beside the title (and as the centred fallback glyph
// when the resolved photo itself fails to load).
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

// Category → overlay pill colour, shown at the top-left of the photo.
const CATEGORY_PILL: Record<string, string> = {
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
 * Soft wash per category for the photo frame: the tint fills the fixed-ratio
 * box so it never looks empty while the photo loads, and the accent colours
 * the fallback icon when there is no photo. Pastels, not grays, so an empty
 * frame still reads as intentional.
 */
export const CATEGORY_WASH: Record<string, { tint: string; accent: string }> = {
  education: { tint: "#ede9fe", accent: "#6d28d9" },
  healthcare: { tint: "#ffe4e6", accent: "#be123c" },
  housing: { tint: "#fef3c7", accent: "#b45309" },
  livelihood: { tint: "#e0f2fe", accent: "#0369a1" },
  emergency_relief: { tint: "#fee2e2", accent: "#b91c1c" },
  infrastructure: { tint: "#e2e8f0", accent: "#475569" },
  social_welfare: { tint: "#d1fae5", accent: "#047857" },
  other: { tint: "#cffafe", accent: "#0e7490" },
};
export const NEUTRAL_WASH = { tint: "#edf1f4", accent: "#64748b" };

/**
 * Side-by-side project rail for the homepage "Our Projects" section.
 *
 * A single-line horizontal strip showing two projects at a time. Each card
 * carries its photo on the left and the title + details on the right. The
 * mouse wheel drives the strip sideways (with edge passthrough, so the page
 * never gets trapped), arrow buttons nudge one card per click, and each card
 * reveals itself as it scrolls into view.
 */
export function ProjectsGrid({ projects }: { projects: PublicProject[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Vertical mouse-wheel over the strip drives it sideways.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Horizontal trackpads / shift-scroll already move sideways natively.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const max = el.scrollWidth - el.clientWidth;
      // At either end the gesture belongs to the page — never trap it.
      if ((e.deltaY > 0 && el.scrollLeft >= max - 1) || (e.deltaY < 0 && el.scrollLeft <= 1)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Arrow buttons advance exactly one card (cell width + the flex gap).
  const nudge = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(":scope > *");
    el.scrollBy({ left: dir * ((first?.offsetWidth || el.clientWidth / 2) + 24), behavior: "smooth" });
  };

  if (projects.length === 0) return null;

  return (
    <div className="relative">
      {/* Single-line strip, two cards per view from `sm` up (one + a peek on
          phones). The entrance sits on this container so the set arrives as
          one group; each card then reveals itself as the strip scrolls. */}
      <div
        ref={trackRef}
        role="region"
        aria-label="Projects"
        className="proj-card-grid scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
      >
        {projects.map((p) => (
          <Reveal
            key={p._id}
            className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.75rem)]"
          >
            <ProjectGridCard project={p} />
          </Reveal>
        ))}
      </div>
      {projects.length > 1 && (
        <>
          <button
            onClick={() => nudge(-1)}
            aria-label="Previous projects"
            className="absolute -left-3 top-[30%] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-hero p-2.5 text-primary-foreground shadow-lg transition hover:opacity-90 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="Next projects"
            className="absolute -right-3 top-[30%] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-hero p-2.5 text-primary-foreground shadow-lg transition hover:opacity-90 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

function ProjectGridCard({ project }: { project: PublicProject }) {
  const navigate = useNavigate();
  const path = projectPath(project);
  const Icon = resolveIcon(CATEGORY_ICON[project.category || "other"]);
  const tiltRef = useTilt<HTMLDivElement>(5);
  const wash = CATEGORY_WASH[project.category || "other"] || NEUTRAL_WASH;
  // Every card gets a photo: the admin-uploaded cover first, then the
  // category stock image (same rule as the hub cards). The tinted frame
  // sits behind it while it loads; the fallback icon is reserved for the
  // genuine "no photo" state — i.e. the resolved image itself fails.
  const src = projectImage(project);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      ref={tiltRef}
      className={cn(
        "tilt-card group flex h-full flex-row gap-4 rounded-2xl bg-card p-3 shadow-sm transition-shadow duration-300 hover:shadow-xl",
        path && "cursor-pointer",
      )}
      onClick={path ? () => navigate(path) : undefined}
      role={path ? "link" : undefined}
      tabIndex={path ? 0 : undefined}
      onKeyDown={
        path
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(path);
              }
            }
          : undefined
      }
    >
      {/* Photo on the left, fixed ratio so the row never shifts as it loads. */}
      <div className="relative w-[42%] shrink-0 self-start">
        <div
          className="proj-card-image proj-card-image-side shadow-sm"
          style={{ "--category-tint": wash.tint, "--category-accent": wash.accent } as CSSProperties}
        >
          {showImage ? (
            <img
              key={src}
              src={src}
              alt={project.name}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(loaded && "loaded", "transition-transform duration-500 group-hover:scale-105")}
            />
          ) : (
            <span className="fallback-icon" aria-hidden>
              <Icon className="h-10 w-10" />
            </span>
          )}
          {/* Deepens the frame behind the pill so the label keeps its
              contrast whatever the photo (or tint) underneath. */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />
        </div>
        {project.category && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow",
              CATEGORY_PILL[project.category] || CATEGORY_PILL.other,
            )}
          >
            {categoryLabel(project.category)}
          </span>
        )}
      </div>

      {/* Title + details on the right. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1 pr-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="truncate text-base font-semibold leading-snug">{project.name}</h3>
        </div>
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-3">{project.description}</p>
        )}
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
