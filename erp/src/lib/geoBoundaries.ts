import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import type { ProjectLocationPoint, ProjectMapRegion } from "@/types/projectPage";
// `?url`: emitted as hashed static files and fetched on demand, so ~300 KB of
// GeoJSON stays out of the JS bundle. (Not in /public — the repo .gitignore
// ignores every `public` folder, so files added there are never committed.)
import keralaUrl from "@/assets/maps/kerala-districts.json?url";
import indiaUrl from "@/assets/maps/india-states.json?url";

/**
 * Boundary data for the project location maps (src/assets/maps).
 *
 * Source: DataMeet India maps (https://github.com/datameet/maps, CC BY 4.0) —
 * States/Admin2 (current states & UTs, India's official boundary) and
 * Districts/Census_2011 (Kerala's 14 districts, unchanged since 1984, plus the
 * neighbouring Karnataka / Tamil Nadu / Mahe clipped around Kerala for context).
 * Simplified with mapshaper (150 m Kerala, 1.8 km India); each feature carries
 * `name`, `abbr` and a precomputed `label` point [lng, lat] (polylabel).
 */

export interface BoundaryProps {
  name: string;
  abbr: string;
  label: [number, number];
  /** Kerala file only: a Kerala district, or a neighbouring area drawn for context. */
  kind?: "district" | "context";
}
export type BoundaryFeature = Feature<Polygon | MultiPolygon, BoundaryProps>;
export type Boundaries = FeatureCollection<Polygon | MultiPolygon, BoundaryProps>;

export const MAP_REGIONS: Record<ProjectMapRegion, { label: string; unit: string; units: string; file: string }> = {
  kerala: { label: "Kerala", unit: "district", units: "districts", file: keralaUrl },
  india: { label: "India", unit: "state", units: "states", file: indiaUrl },
};

export const BOUNDARY_ATTRIBUTION =
  'Boundaries: <a href="https://github.com/datameet/maps" target="_blank" rel="noopener">DataMeet</a> (CC BY 4.0)';

export function useBoundaries(region: ProjectMapRegion, enabled = true) {
  return useQuery({
    queryKey: ["map-boundaries", region],
    queryFn: async () => {
      const res = await fetch(MAP_REGIONS[region].file);
      if (!res.ok) throw new Error(`Map data failed to load (${res.status})`);
      return (await res.json()) as Boundaries;
    },
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

const polygonsOf = (f: BoundaryFeature): Position[][][] =>
  f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;

function ringArea(ring: Position[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
}

/** Outer ring of the feature's biggest polygon (an island chain is sized by its main island). */
export function mainRing(f: BoundaryFeature): Position[] {
  return polygonsOf(f).reduce((best, poly) => (ringArea(poly[0]) > ringArea(best) ? poly[0] : best), polygonsOf(f)[0][0]);
}

function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function featureContains(f: BoundaryFeature, lat: number, lng: number): boolean {
  return polygonsOf(f).some(([outer, ...holes]) => inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h)));
}

/** Distance in km from the point to the feature's outline (flat-earth; fine at these scales). */
function distanceKm(f: BoundaryFeature, lat: number, lng: number): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (const poly of polygonsOf(f)) {
    for (const ring of poly) {
      for (let i = 1; i < ring.length; i++) {
        const ax = (ring[i - 1][0] - lng) * kx, ay = (ring[i - 1][1] - lat) * ky;
        const bx = (ring[i][0] - lng) * kx, by = (ring[i][1] - lat) * ky;
        const dx = bx - ax, dy = by - ay;
        const len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
        best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
      }
    }
  }
  return best;
}

/**
 * The area containing the point or, failing that, the nearest one within
 * `maxKm` — simplified coastlines leave beaches and harbours just outside.
 */
function findFeature(features: BoundaryFeature[], lat: number, lng: number, maxKm: number): BoundaryFeature | null {
  const hit = features.find((f) => featureContains(f, lat, lng));
  if (hit) return hit;
  let nearest: BoundaryFeature | null = null;
  let bestKm = maxKm;
  for (const f of features) {
    const d = distanceKm(f, lat, lng);
    if (d < bestKm) {
      bestKm = d;
      nearest = f;
    }
  }
  return nearest;
}

/** Kerala district (if any) and state/UT a point falls in. */
export function locatePoint(lat: number, lng: number, kerala?: Boundaries, india?: Boundaries): { district: string; state: string } {
  let district = "";
  if (kerala) {
    // Containment first across districts and the context areas, so a point in
    // Mahe or across the border is not snapped onto the nearest Kerala district.
    const hit = kerala.features.find((f) => featureContains(f, lat, lng));
    const d = hit
      ? hit.properties.kind === "district" ? hit : null
      : findFeature(kerala.features.filter((f) => f.properties.kind === "district"), lat, lng, 8);
    if (d) district = d.properties.name;
  }
  if (district) return { district, state: "Kerala" };
  const s = india ? findFeature(india.features, lat, lng, 25) : null;
  return { district: "", state: s ? s.properties.name : "" };
}

/** Whether the point belongs on this map (a Kerala map shows Kerala points only). */
export function pointInRegion(region: ProjectMapRegion, p: Pick<ProjectLocationPoint, "district" | "state">): boolean {
  return region === "india" || !!p.district || p.state === "Kerala";
}

/** District (Kerala map) or state (India map) a point is grouped and highlighted under. */
export function areaOf(region: ProjectMapRegion, p: Pick<ProjectLocationPoint, "district" | "state">): string {
  return (region === "kerala" ? p.district : p.state) || "";
}
