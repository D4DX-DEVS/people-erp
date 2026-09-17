import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categoryLabel, projectImage, projectPath, type PublicProject } from "@/lib/siteProjects";
import { depthForIndex, useParallax, useTilt } from "@/hooks/useParallax";

/**
 * Project tile shared by the home page, the projects hub and live-content
 * sections. Opens the project's detail page when one is published.
 *
 * The photo drifts against the page scroll and the card tips towards the
 * pointer; `index` picks the drift rate so cards in a row never move in
 * lockstep. Both effects are dropped for reduced motion (see useParallax).
 */
export function ProjectCard({
  project,
  showStatus,
  index = 0,
}: {
  project: PublicProject;
  showStatus?: boolean;
  index?: number;
}) {
  const navigate = useNavigate();
  const path = projectPath(project);
  const open = () => path && navigate(path);
  const tiltRef = useTilt<HTMLDivElement>(5);
  const imageRef = useParallax<HTMLDivElement>(depthForIndex(index));

  return (
    <Card
      ref={tiltRef}
      className={cn("tilt-card group flex h-full flex-col overflow-hidden border-border/60 transition-shadow hover:shadow-xl", path && "cursor-pointer")}
      onClick={path ? open : undefined}
      role={path ? "link" : undefined}
      tabIndex={path ? 0 : undefined}
      onKeyDown={path ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } } : undefined}
    >
      <div className="parallax-frame relative h-40 overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {project.category && <Badge variant="secondary" className="capitalize">{categoryLabel(project.category)}</Badge>}
          {showStatus && project.status && (
            <Badge variant={project.status === "completed" ? "secondary" : "default"}>
              {project.status === "completed" ? "Completed" : "Ongoing"}
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold">{project.name}</h3>
        {project.description && <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>}
        {path && (
          <span className="mt-auto inline-flex items-center pt-1 text-sm font-medium text-primary">
            View project <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
