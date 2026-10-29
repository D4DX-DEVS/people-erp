import { lazy, Suspense, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { SectionHeading } from "@/components/site/PageSections";
import { cn } from "@/lib/utils";
import { colorValue, iconBadgeStyle } from "@/lib/siteColors";
import { MAP_REGIONS, areaOf, pointInRegion } from "@/lib/geoBoundaries";
import type { ProjectLocationMap, ProjectLocationPoint } from "@/types/projectPage";

const LocationMap = lazy(() => import("./LocationMap"));

/**
 * Public "Where We Work" block on a project page: the Kerala / India map with
 * the project's places pinned and their districts/states highlighted, and the
 * places listed beside it grouped by district/state. Pin numbers match the list.
 */
export function ProjectLocations({ map, accentColor }: { map?: ProjectLocationMap; accentColor?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);

  const region = map?.region || "kerala";
  const points = (map?.points || []).filter((p) => pointInRegion(region, p));
  if (!map?.visible || !points.length) return null;

  const info = MAP_REGIONS[region];
  const groups = new Map<string, Array<{ p: ProjectLocationPoint; i: number }>>();
  points.forEach((p, i) => {
    const key = areaOf(region, p) || "Other";
    groups.set(key, [...(groups.get(key) || []), { p, i }]);
  });
  const ordered = [...groups].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  const areaCount = ordered.filter(([k]) => k !== "Other").length;
  const accent = accentColor ? colorValue(accentColor) : undefined;

  const select = (i: number) => {
    setActive(i);
    // On a phone the list sits under the map: bring the map back into view.
    const box = mapBox.current?.getBoundingClientRect();
    if (box && (box.top < 0 || box.bottom > window.innerHeight)) {
      mapBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="py-6 sm:py-8 md:py-10 [overflow-wrap:anywhere]">
      <div className="container mx-auto px-4">
        <SectionHeading
          title={map.title || "Where We Work"}
          subtitle={map.subtitle}
          icon="map-pin"
          badge={iconBadgeStyle(undefined, accentColor)}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div
            ref={mapBox}
            className="h-[440px] overflow-hidden rounded-3xl border bg-card shadow-sm sm:h-[540px] lg:h-[600px]"
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
                </div>
              }
            >
              <LocationMap region={region} points={points} accent={accent} activeIndex={active} onSelect={setActive} />
            </Suspense>
          </div>

          <div className="flex flex-col rounded-3xl border bg-card p-4 shadow-sm sm:p-5 lg:max-h-[600px]">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={iconBadgeStyle(undefined, accentColor)}>
                {points.length} location{points.length === 1 ? "" : "s"}
              </span>
              {areaCount > 0 && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {areaCount} {areaCount === 1 ? info.unit : info.units}
                </span>
              )}
            </div>
            <div className="-mr-2 space-y-4 overflow-y-auto pr-2">
              {ordered.map(([area, items]) => (
                <div key={area}>
                  <h3 className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{area}</span>
                    <span className="font-semibold">{items.length}</span>
                  </h3>
                  <ul className="space-y-1">
                    {items.map(({ p, i }) => (
                      <li key={p._id || i}>
                        <button
                          type="button"
                          onClick={() => select(i)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60",
                            active === i && "bg-muted",
                          )}
                        >
                          <span
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
                            style={accent ? { backgroundColor: accent } : undefined}
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-snug">{p.name}</span>
                            {p.description && (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{p.description}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
