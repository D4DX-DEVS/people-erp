import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categoryLabel, projectImage, projectPath, type PublicProject } from "@/lib/siteProjects";

/**
 * Project tile shared by the home page, the projects hub and live-content
 * sections. Opens the project's detail page when one is published.
 */
export function ProjectCard({ project, showStatus }: { project: PublicProject; showStatus?: boolean }) {
  const navigate = useNavigate();
  const path = projectPath(project);
  const open = () => path && navigate(path);

  return (
    <Card
      className={cn("group flex h-full flex-col overflow-hidden border-border/60 transition-shadow hover:shadow-xl", path && "cursor-pointer")}
      onClick={path ? open : undefined}
      role={path ? "link" : undefined}
      tabIndex={path ? 0 : undefined}
      onKeyDown={path ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } } : undefined}
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={projectImage(project)}
          alt={project.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
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
