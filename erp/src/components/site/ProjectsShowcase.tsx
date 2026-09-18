import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabel, projectImage, projectPath, type PublicProject } from "@/lib/siteProjects";

/** How many projects the rail shows. The hub page carries the full list. */
const PANEL_COUNT = 5;
/** Time each project holds the open panel before the next takes a turn. */
const ADVANCE_MS = 5200;

/**
 * "Our Projects" as an expanding rail.
 *
 * Five project panels share one row. The open panel grows to roughly three and
 * a half times a closed one and shows the photo, category, name and summary;
 * the rest collapse to a strip carrying the project name set vertically. Only
 * `flex-grow` changes, so the whole handover is a single composited transition
 * — no width maths, no reflow of the images inside.
 *
 * The rail advances on a timer so it reads as alive without the visitor having
 * to find the hover, and holds the moment the pointer or keyboard arrives so
 * the thing you are reading never slides out from under you.
 *
 * Below `sm` five vertical labels would be unreadable slivers, so the same
 * records render as a plain stacked list instead.
 */
export function ProjectsShowcase({ projects }: { projects: PublicProject[] }) {
  const items = projects.slice(0, PANEL_COUNT);
  const [active, setActive] = useState(0);
  const [holding, setHolding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (holding || items.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % items.length), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [holding, items.length]);

  if (items.length === 0) return null;

  const open = (path: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <>
      {/* ── Rail (sm and up) ─────────────────────────────────────────────── */}
      <div
        className="hidden gap-2 sm:flex sm:h-[20rem] lg:h-[22rem]"
        onMouseLeave={() => setHolding(false)}
      >
        {items.map((p, i) => {
          const isActive = i === active;
          const path = projectPath(p);
          return (
            <a
              key={p._id}
              href={path}
              onClick={open(path)}
              onMouseEnter={() => {
                setHolding(true);
                setActive(i);
              }}
              onFocus={() => {
                setHolding(true);
                setActive(i);
              }}
              onBlur={() => setHolding(false)}
              className="group relative min-w-0 basis-0 overflow-hidden rounded-2xl bg-foreground/90 shadow-lg outline-none ring-offset-2 ring-offset-background transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
              style={{ flexGrow: isActive ? 3.4 : 1 }}
            >
              <img
                src={projectImage(p)}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out",
                  isActive ? "scale-105" : "scale-100",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 transition-colors duration-500",
                  isActive ? "bg-gradient-to-t from-black/85 via-black/40 to-black/10" : "bg-black/60",
                )}
              />

              {/* Closed state: the name runs up the strip. */}
              <span
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-white/90 transition-opacity duration-300",
                  isActive ? "opacity-0" : "opacity-100",
                )}
              >
                {p.name}
              </span>

              {/* Open state: the reading panel. */}
              <span
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 block p-5 transition-opacity duration-500 sm:p-6",
                  isActive ? "opacity-100 delay-200" : "opacity-0",
                )}
              >
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  {categoryLabel(p.category)}
                </span>
                <span className="mt-2 block text-lg font-bold leading-snug text-white sm:text-2xl">
                  {p.name}
                </span>
                {p.description && (
                  <span className="mt-1.5 line-clamp-2 block max-w-md text-sm leading-relaxed text-white/80">
                    {p.description}
                  </span>
                )}
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {/* ── Stacked list (below sm) ──────────────────────────────────────── */}
      <div className="grid gap-3 sm:hidden">
        {items.map((p) => {
          const path = projectPath(p);
          return (
            <a
              key={p._id}
              href={path}
              onClick={open(path)}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <img
                src={projectImage(p)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-16 w-20 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {categoryLabel(p.category)}
                </span>
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                {p.description && (
                  <span className="line-clamp-1 block text-xs text-muted-foreground">{p.description}</span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          );
        })}
      </div>
    </>
  );
}
