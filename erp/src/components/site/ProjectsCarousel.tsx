import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectShowcaseCard } from "@/components/site/ProjectShowcaseCard";
import type { PublicProject } from "@/lib/siteProjects";

/** Auto-advancing, arrow-navigable horizontal carousel for the homepage projects. */
export function ProjectsCarousel({ projects }: { projects: PublicProject[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const advance = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el || projects.length <= 1) return;
    const timer = setInterval(() => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo(atEnd ? { left: 0, behavior: "smooth" } : { left: el.scrollLeft + el.clientWidth * 0.85, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(timer);
  }, [projects.length]);

  return (
    <div className="relative">
      <div ref={trackRef} className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2">
        {projects.map((p, i) => (
          <div key={p._id} className="w-[80%] shrink-0 snap-start sm:w-[45%] lg:w-[30%] xl:w-[23%]">
            <ProjectShowcaseCard project={p} index={i} />
          </div>
        ))}
      </div>
      {projects.length > 1 && (
        <>
          <button
            onClick={() => advance(-1)}
            aria-label="Previous projects"
            className="absolute -left-3 top-[38%] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-hero p-2.5 text-primary-foreground shadow-lg transition hover:opacity-90 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => advance(1)}
            aria-label="Next projects"
            className="absolute -right-3 top-[38%] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-hero p-2.5 text-primary-foreground shadow-lg transition hover:opacity-90 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
