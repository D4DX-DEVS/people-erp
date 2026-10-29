import { useEffect, useRef, useState, type CSSProperties } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import "./locationMap.css";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectLocationPoint, ProjectMapRegion } from "@/types/projectPage";
import {
  type BoundaryFeature, useBoundaries, mainRing, areaOf, pointInRegion, BOUNDARY_ATTRIBUTION,
} from "@/lib/geoBoundaries";

/**
 * Kerala (districts) or India (states) map with numbered location pins, drawn
 * from the boundary GeoJSON with Leaflet — no tile server, so the public map
 * is the official India outline in the site's own colours. Shared by the
 * public project page and the admin editor (`editable`), and loaded lazily so
 * Leaflet stays out of the main bundle.
 */
export interface LocationMapProps {
  region: ProjectMapRegion;
  /** Pins are numbered by their position here; points outside the region are skipped. */
  points: ProjectLocationPoint[];
  /** CSS colour for pins and highlighted areas; defaults to the brand colour. */
  accent?: string;
  /** Selected point: the map flies to it and opens its popup. */
  activeIndex?: number | null;
  onSelect?: (index: number | null) => void;
  /** Admin: scroll-zoom always on, pins draggable, clicks reported. */
  editable?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onPointMove?: (index: number, lat: number, lng: number) => void;
  /** Admin: the place being added. `focus` zooms to it (search results). */
  preview?: { lat: number; lng: number; focus?: boolean } | null;
  onPreviewMove?: (lat: number, lng: number) => void;
  /** Admin: OpenStreetMap streets under the boundaries, for precise placement. */
  streetLayer?: boolean;
  className?: string;
}

const SEA_LABELS: Record<ProjectMapRegion, Array<{ text: string; at: [number, number] }>> = {
  kerala: [{ text: "Arabian Sea", at: [10.35, 75.4] }],
  india: [
    { text: "Arabian Sea", at: [15.5, 70] },
    { text: "Bay of Bengal", at: [15.5, 87.2] },
  ],
};
const MAX_ZOOM: Record<ProjectMapRegion, number> = { kerala: 13, india: 11 };
const STREET_MAX_ZOOM = 18;

interface LabelEntry {
  /** Label marker; its element only exists once the map has a view. */
  marker: L.Marker;
  /** Name first, then the abbreviation; the first that fits its area and clears placed labels wins. */
  texts: string[];
  at: L.LatLng;
  bounds: L.LatLngBounds | null;
  charW: number;
}

function popupContent(p: ProjectLocationPoint): HTMLElement {
  const root = document.createElement("div");
  const line = (cls: string, text: string) => {
    const el = document.createElement("div");
    el.className = cls;
    el.textContent = text;
    root.appendChild(el);
  };
  line("lm-popup__title", p.name);
  const area = [p.district && `${p.district} district`, p.state].filter(Boolean).join(", ");
  if (area) line("lm-popup__area", area);
  if (p.description) line("lm-popup__text", p.description);
  return root;
}

const pinIcon = (n: number, active: boolean) =>
  L.divIcon({
    className: "lm-pin-icon",
    html: `<div class="lm-pin${active ? " lm-pin--active" : ""}"><span>${n}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
    tooltipAnchor: [0, -30],
  });

export default function LocationMap({
  region, points, accent, activeIndex = null, onSelect, editable = false,
  onMapClick, onPointMove, preview, onPreviewMove, streetLayer = false, className,
}: LocationMapProps) {
  const { data, isLoading, isError } = useBoundaries(region);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const areaLayer = useRef<L.GeoJSON | null>(null);
  const labelLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Map<number, L.Marker>>(new Map());
  const previewMarker = useRef<L.Marker | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const labels = useRef<LabelEntry[]>([]);
  const fitZoom = useRef(6);
  const fit = useRef<() => void>(() => {});
  const interacted = useRef(false);
  const rebuilding = useRef(false);
  const lastActive = useRef<number | null>(null);
  const [engaged, setEngaged] = useState(editable);

  // Latest callbacks, read from the long-lived Leaflet handlers.
  const cb = useRef({ onSelect, onMapClick, onPointMove, onPreviewMove, editable });
  cb.current = { onSelect, onMapClick, onPointMove, onPreviewMove, editable };

  // ---- map instance -------------------------------------------------------
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const map = L.map(el, {
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      // A public map embedded in a long page must not hijack scrolling: wheel
      // zoom (and one-finger drag on phones) switch on once it is clicked.
      scrollWheelZoom: editable,
      dragging: editable || !L.Browser.mobile,
      attributionControl: false,
    });
    L.control
      .attribution({ prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' })
      .addAttribution(BOUNDARY_ATTRIBUTION)
      .addTo(map);
    const pane = map.createPane("lm-labels");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
    labelLayer.current = L.layerGroup().addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);

    const engage = () => {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
      setEngaged(true);
    };
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!cb.current.editable) engage();
      else cb.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
    });
    map.on("focus", () => !cb.current.editable && engage());
    map.on("moveend", () => layoutLabels());

    const touched = () => { interacted.current = true; };
    el.addEventListener("pointerdown", touched);
    el.addEventListener("wheel", touched, { passive: true });

    // The map may mount in a container that is still sizing (lazy load, a card
    // opening): keep the view fitted until the visitor starts moving it.
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!interacted.current) fit.current();
    });
    ro.observe(el);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", touched);
      el.removeEventListener("wheel", touched);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Show each area's name (or abbreviation) only where it fits, is in view and
   * doesn't collide with another label. Pins are a soft obstacle: a label
   * under a pin moves just below or above it if there is room, else stays put.
   */
  function layoutLabels() {
    const map = mapRef.current;
    if (!map || !map.getSize().x) return;
    try {
      map.getCenter(); // throws until the first fit has given the map a view
    } catch {
      return;
    }
    const size = map.getSize();
    type Box = [number, number, number, number];
    const hits = (box: Box, boxes: Box[]) =>
      boxes.some((b) => box[0] < b[2] + 4 && box[2] + 4 > b[0] && box[1] < b[3] + 3 && box[3] + 3 > b[1]);
    const placed: Box[] = [];
    const pins: Box[] = [];
    markers.current.forEach((m) => {
      const pt = map.latLngToContainerPoint(m.getLatLng());
      pins.push([pt.x - 13, pt.y - 34, pt.x + 13, pt.y]);
    });
    for (const e of labels.current) {
      const el = e.marker.getElement()?.firstElementChild as HTMLElement | null | undefined;
      if (!el) continue;
      let shown = "";
      let shift = 0;
      const p = map.latLngToContainerPoint(e.at);
      let w = Infinity;
      let h = Infinity;
      if (e.bounds) {
        const nw = map.latLngToContainerPoint(e.bounds.getNorthWest());
        const se = map.latLngToContainerPoint(e.bounds.getSouthEast());
        w = Math.abs(se.x - nw.x);
        h = Math.abs(se.y - nw.y);
      }
      search: for (const text of e.texts) {
        const tw = text.length * e.charW + 4;
        const th = 12;
        if (tw > w * 1.35 || th > h * 1.4) continue;
        const at = (dy: number): Box => [p.x - tw / 2, p.y + dy - th / 2, p.x + tw / 2, p.y + dy + th / 2];
        const inView = (b: Box) => b[0] >= 2 && b[1] >= 2 && b[2] <= size.x - 2 && b[3] <= size.y - 2;
        const spots = [0, 18, -18].filter((dy) => inView(at(dy)) && !hits(at(dy), placed));
        if (!spots.length) continue;
        const dy = spots.find((d) => !hits(at(d), pins)) ?? spots[0];
        placed.push(at(dy));
        shown = text;
        shift = dy;
        break search;
      }
      el.textContent = shown;
      el.style.marginTop = shift ? `${shift}px` : "";
    }
  }

  // ---- fit the view to Kerala / India ---------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    const focus = (data.features as BoundaryFeature[]).filter((f) => f.properties.kind !== "context");
    const bounds = L.geoJSON({ type: "FeatureCollection", features: focus } as FeatureCollection).getBounds();
    fit.current = () => {
      if (!map.getSize().x || !map.getSize().y) return; // not laid out yet; the resize observer refits
      map.setMinZoom(0);
      map.setMaxBounds(undefined as unknown as L.LatLngBounds);
      map.fitBounds(bounds, { padding: [12, 12], animate: false });
      fitZoom.current = map.getZoom();
      map.setMinZoom(Math.max(0, fitZoom.current - 0.75));
      map.setMaxBounds(bounds.pad(region === "kerala" ? 0.45 : 0.25));
      layoutLabels();
    };
    interacted.current = false;
    fit.current();
  }, [data, region]);

  // ---- areas + labels (re-drawn when points change, to highlight areas) ----
  const regionPoints = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && pointInRegion(region, p));
  const areaCounts = new Map<string, number>();
  for (const { p } of regionPoints) {
    const a = areaOf(region, p);
    if (a) areaCounts.set(a, (areaCounts.get(a) || 0) + 1);
  }
  const countsKey = [...areaCounts].map(([k, v]) => `${k}:${v}`).join("|");

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    areaLayer.current?.remove();
    labelLayer.current?.clearLayers();

    const unit = region === "kerala" ? "district" : "";
    areaLayer.current = L.geoJSON(data, {
      style: (f) => {
        const props = (f as BoundaryFeature).properties;
        const context = props.kind === "context";
        return {
          className: cn("lm-area", context && "lm-area--context", !context && areaCounts.has(props.name) && "lm-area--active"),
        };
      },
      onEachFeature: (f, layer) => {
        const props = (f as BoundaryFeature).properties;
        const n = areaCounts.get(props.name) || 0;
        const context = props.kind === "context";
        const name = context || !unit ? props.name : `${props.name} ${unit}`;
        layer.bindTooltip(n ? `${name} · ${n} location${n === 1 ? "" : "s"}` : name, {
          sticky: true, direction: "top", offset: [0, -8], className: "lm-tip",
        });
      },
    }).addTo(map);
    areaLayer.current.bringToBack();

    // Active areas claim their label space first, then bigger areas, seas last.
    const features = (data.features as BoundaryFeature[]).slice().map((f) => {
      const ring = mainRing(f).map(([lng, lat]) => L.latLng(lat, lng));
      const bounds = L.latLngBounds(ring);
      const size = (bounds.getEast() - bounds.getWest()) * (bounds.getNorth() - bounds.getSouth());
      return { f, bounds, size, active: areaCounts.has(f.properties.name) };
    });
    features.sort((a, b) => Number(b.active) - Number(a.active) || b.size - a.size);

    const entries: LabelEntry[] = [];
    const addLabel = (at: L.LatLng, cls: string, texts: string[], bounds: L.LatLngBounds | null, charW: number) => {
      const marker = L.marker(at, {
        icon: L.divIcon({ className: cn("lm-label", cls), html: '<span class="lm-label__text"></span>', iconSize: [0, 0] }),
        pane: "lm-labels",
        interactive: false,
        keyboard: false,
      }).addTo(labelLayer.current!);
      entries.push({ marker, texts, at, bounds, charW });
    };
    for (const { f, bounds, active } of features) {
      const { name, abbr, label, kind } = f.properties;
      const at = L.latLng(label[1], label[0]);
      if (kind === "context") addLabel(at, "lm-label--context", [name], bounds, 8);
      else addLabel(at, active ? "lm-label--active" : "", abbr && abbr !== name ? [name, abbr] : [name], bounds, 6.6);
    }
    for (const sea of SEA_LABELS[region]) addLabel(L.latLng(sea.at[0], sea.at[1]), "lm-label--sea", [sea.text], null, 7);
    labels.current = entries;
    layoutLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, region, countsKey]);

  // ---- street tiles (admin) -------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (streetLayer) {
      tiles.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: STREET_MAX_ZOOM,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.setMaxZoom(STREET_MAX_ZOOM);
    } else {
      map.setMaxZoom(MAX_ZOOM[region]);
    }
    return () => {
      tiles.current?.remove();
      tiles.current = null;
    };
  }, [streetLayer, region]);

  // ---- pins -----------------------------------------------------------------
  const pointsKey = regionPoints.map(({ p, i }) => `${i}:${p.lat},${p.lng}:${p.name}:${p.description || ""}:${p.district || ""}:${p.state || ""}`).join("|");
  useEffect(() => {
    const group = markerLayer.current;
    if (!group) return;
    // Removing a pin closes its popup; that is not the visitor deselecting it.
    rebuilding.current = true;
    group.clearLayers();
    rebuilding.current = false;
    markers.current.clear();
    for (const { p, i } of regionPoints) {
      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon(i + 1, i === activeIndex),
        draggable: editable,
        riseOnHover: true,
        zIndexOffset: i === activeIndex ? 1000 : 0,
      })
        .bindTooltip(p.name, { direction: "top", className: "lm-tip" })
        .bindPopup(popupContent(p), { maxWidth: 260, autoPanPadding: [24, 24] })
        .on("click", () => cb.current.onSelect?.(i))
        .on("popupclose", () => !rebuilding.current && cb.current.onSelect?.(null))
        .on("dragend", (e) => {
          const ll = (e.target as L.Marker).getLatLng();
          cb.current.onPointMove?.(i, ll.lat, ll.lng);
        })
        .addTo(group);
      markers.current.set(i, marker);
    }
    layoutLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, editable]);

  // ---- selection: restyle the pin, bring it into view, open its popup -------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m, i) => {
      const active = i === activeIndex;
      m.setIcon(pinIcon(i + 1, active));
      m.setZIndexOffset(active ? 1000 : 0);
    });
    const changed = lastActive.current !== activeIndex;
    lastActive.current = activeIndex;
    if (activeIndex === null || activeIndex === undefined) return;
    const marker = markers.current.get(activeIndex);
    if (!marker || marker.isPopupOpen()) return; // clicked on the map: already in view
    // Same point, pins just re-drawn (an edit): reopen in place rather than fly.
    if (!changed) {
      marker.openPopup();
      return;
    }
    const target = Math.max(map.getZoom(), fitZoom.current + 1.5);
    map.flyTo(marker.getLatLng(), Math.min(target, map.getMaxZoom()), { duration: 0.6 });
    map.once("moveend", () => marker.openPopup());
  }, [activeIndex, pointsKey]);

  // ---- pending place (admin) ------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!preview) {
      previewMarker.current?.remove();
      previewMarker.current = null;
      return;
    }
    const ll = L.latLng(preview.lat, preview.lng);
    if (!previewMarker.current) {
      previewMarker.current = L.marker(ll, {
        icon: L.divIcon({ className: "lm-pin-icon", html: '<div class="lm-preview"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        draggable: true,
        zIndexOffset: 2000,
      })
        .bindTooltip("New location — drag to adjust", { direction: "top", offset: [0, -12], className: "lm-tip" })
        .on("dragend", (e) => {
          const p = (e.target as L.Marker).getLatLng();
          cb.current.onPreviewMove?.(p.lat, p.lng);
        })
        .addTo(map);
    } else {
      previewMarker.current.setLatLng(ll);
    }
    if (preview.focus) {
      map.flyTo(ll, Math.min(Math.max(map.getZoom(), fitZoom.current + 2), map.getMaxZoom()), { duration: 0.6 });
    } else if (!map.getBounds().contains(ll)) {
      map.panTo(ll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!preview, preview?.lat, preview?.lng, preview?.focus]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div
        ref={elRef}
        className={cn("lm-map", streetLayer && "lm-map--street")}
        style={accent ? ({ "--lm-accent": accent } as CSSProperties) : undefined}
        aria-label={`Map of ${region === "kerala" ? "Kerala districts" : "Indian states"} with project locations`}
      />
      {isLoading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/60 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
        </div>
      )}
      {isError && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card/80 px-6 text-center text-sm text-muted-foreground">
          The map could not be loaded. Please refresh the page.
        </div>
      )}
      {!editable && !engaged && data && (
        <div className="lm-hint">Click or tap the map to zoom and move around</div>
      )}
    </div>
  );
}
