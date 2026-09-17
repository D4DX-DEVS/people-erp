import { Fragment } from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Leave off the last entry — the page you are on is never a link. */
  href?: string;
}

/**
 * The trail strip every public inner page carries between its hero and its
 * body. Home is implicit, so callers pass only what comes after it:
 *
 *   <SiteBreadcrumbs items={[{ label: "News", href: "/news" }, { label: title }]} />
 *
 * Desktop only, at the same `lg` boundary as the footer and the desktop menu:
 * below it the site runs as an app shell whose bottom tab bar and back
 * gestures already carry navigation, and the trail was just a second row of
 * chrome between the hero and the content.
 */
export function SiteBreadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn("hidden border-b border-border/60 bg-muted/40 lg:block", className)}>
      <div className="container mx-auto px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList className="gap-1 text-xs sm:gap-1.5 sm:text-sm">
            {trail.map((crumb, i) => {
              const last = i === trail.length - 1;
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <BreadcrumbItem className="min-w-0">
                    {last || !crumb.href ? (
                      // A record title can be a whole sentence. Truncating the
                      // current page rather than its ancestors keeps the part
                      // that is actually navigable fully readable, and keeps
                      // the trail from forcing the page to scroll sideways.
                      <BreadcrumbPage className="max-w-[11rem] truncate font-medium sm:max-w-md">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          to={crumb.href}
                          className="inline-flex max-w-[9rem] items-center gap-1 truncate hover:text-primary sm:max-w-none"
                        >
                          {i === 0 && <Home className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!last && (
                    <BreadcrumbSeparator>
                      <ChevronRight />
                    </BreadcrumbSeparator>
                  )}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </nav>
  );
}
