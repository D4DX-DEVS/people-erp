import { lazy, Suspense, useRef, useState } from "react";
import { AlertTriangle, Crosshair, Loader2, MapPin, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectPages } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MAP_REGIONS, useBoundaries, locatePoint, pointInRegion } from "@/lib/geoBoundaries";
import type { ProjectLocationMap, ProjectLocationPoint, ProjectMapRegion } from "@/types/projectPage";

const LocationMap = lazy(() => import("./LocationMap"));

const MAX_POINTS = 200;

/** A place from the search API (OpenStreetMap Nominatim via /project-pages/geocode). */
interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
  district?: string;
  state?: string;
}

/** The place being added: picked from the search or dropped on the map, not saved until "Add to map". */
interface PendingPlace extends ProjectLocationPoint {
  focus: boolean;
  lookingUp?: boolean;
}

const coords = (p: { lat: number; lng: number }) => `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
const areaText = (p: Pick<ProjectLocationPoint, "district" | "state">) =>
  [p.district && `${p.district} district`, p.state].filter(Boolean).join(", ") || "Outside the mapped area";

/**
 * Admin card on the project page builder: search places (or click the map),
 * confirm them onto a Kerala-districts or India-states map, and edit the list.
 */
export function ProjectLocationsEditor({
  value, onChange, disabled, accent,
}: {
  value: ProjectLocationMap;
  onChange: (next: ProjectLocationMap) => void;
  disabled?: boolean;
  /** CSS colour for pins (the page's accent). */
  accent?: string;
}) {
  const kerala = useBoundaries("kerala", value.visible);
  const india = useBoundaries("india", value.visible);
  const ready = !!kerala.data && !!india.data;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [pending, setPending] = useState<PendingPlace | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [street, setStreet] = useState(false);
  const lookup = useRef(0);

  const region = value.region;
  const regionInfo = MAP_REGIONS[region];
  const points = value.points || [];
  const outside = points.filter((p) => !pointInRegion(region, p)).length;

  const update = (patch: Partial<ProjectLocationMap>) => onChange({ ...value, ...patch });
  const setPoints = (next: ProjectLocationPoint[]) => update({ points: next });
  const locate = (lat: number, lng: number) => locatePoint(lat, lng, kerala.data, india.data);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await projectPages.searchPlaces(q, region);
      setResults((res?.data as PlaceResult[]) || []);
    } catch (e) {
      setResults([]);
      setSearchError((e instanceof Error && e.message) || "Place search failed");
    } finally {
      setSearching(false);
    }
  };

  const choose = (place: PlaceResult) => {
    const area = locate(place.lat, place.lng);
    setActiveIndex(null);
    setPending({
      name: place.name,
      description: "",
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      district: area.district,
      state: area.state || place.state || "",
      focus: true,
    });
  };

  // Dropping a pin names it from the reverse lookup unless the admin typed a name first.
  const dropPin = async (lat: number, lng: number) => {
    if (disabled || !ready) return;
    const area = locate(lat, lng);
    const id = ++lookup.current;
    setActiveIndex(null);
    setPending({ name: "", description: "", address: "", lat, lng, ...area, focus: false, lookingUp: true });
    try {
      const res = await projectPages.reversePlace(lat, lng);
      const place = (res?.data as PlaceResult | null) || null;
      if (id !== lookup.current) return;
      setPending((p) => (p ? {
        ...p,
        name: p.name || place?.name || "",
        address: place?.address || "",
        state: p.state || place?.state || "",
        lookingUp: false,
      } : p));
    } catch {
      if (id === lookup.current) setPending((p) => (p ? { ...p, lookingUp: false } : p));
    }
  };

  const movePending = (lat: number, lng: number) =>
    setPending((p) => (p ? { ...p, lat, lng, ...locate(lat, lng), focus: false } : p));

  const addPending = () => {
    if (!pending || !pending.name.trim() || points.length >= MAX_POINTS) return;
    const { name, description, address, lat, lng, district, state } = pending;
    setPoints([...points, { name: name.trim(), description: (description || "").trim(), address, lat, lng, district, state }]);
    setPending(null);
    setResults(null);
    setQuery("");
    setActiveIndex(points.length);
  };

  const updatePoint = (i: number, patch: Partial<ProjectLocationPoint>) =>
    setPoints(points.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const removePoint = (i: number) => {
    setPoints(points.filter((_, idx) => idx !== i));
    setActiveIndex(null);
  };

  const pendingOutside = pending ? !pointInRegion(region, pending) : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Locations Map</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Show on page</Label>
            <Switch disabled={disabled} checked={value.visible} onCheckedChange={(v) => update({ visible: v })} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Plot the places this project reaches on a map of Kerala (with district borders) or India (with state borders).
          It appears on the public page right after the project overview, with the locations listed beside it.
        </p>
      </CardHeader>

      {value.visible && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Map</Label>
              <Select
                disabled={disabled}
                value={region}
                onValueChange={(v) => {
                  update({ region: v as ProjectMapRegion });
                  setResults(null);
                  setActiveIndex(null);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kerala">Kerala — districts</SelectItem>
                  <SelectItem value="india">India — states</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Heading</Label>
              <Input disabled={disabled} placeholder="Where We Work" value={value.title || ""} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Subtitle</Label>
              <Input
                disabled={disabled}
                placeholder="Optional line under the heading"
                value={value.subtitle || ""}
                onChange={(e) => update({ subtitle: e.target.value })}
              />
            </div>
          </div>

          {outside > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {outside} location{outside === 1 ? " is" : "s are"} outside Kerala and won't show on the Kerala map.
                Switch the map to India to show {outside === 1 ? "it" : "them"}, or remove {outside === 1 ? "it" : "them"}.
              </span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Map */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {disabled ? "Read-only." : "Search for a place, or click the map to drop a pin. Drag pins to fine-tune."}
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Street detail</Label>
                  <Switch checked={street} onCheckedChange={setStreet} />
                </div>
              </div>
              <div className="h-[460px] overflow-hidden rounded-xl border sm:h-[560px]">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
                    </div>
                  }
                >
                  <LocationMap
                    region={region}
                    points={points}
                    accent={accent}
                    editable={!disabled}
                    activeIndex={activeIndex}
                    onSelect={setActiveIndex}
                    onMapClick={dropPin}
                    onPointMove={(i, lat, lng) => updatePoint(i, { lat, lng, ...locate(lat, lng) })}
                    preview={pending ? { lat: pending.lat, lng: pending.lng, focus: pending.focus } : null}
                    onPreviewMove={movePending}
                    streetLayer={street}
                  />
                </Suspense>
              </div>
            </div>

            {/* Search, pending place, list */}
            <div className="space-y-4">
              {!disabled && (
                <div className="space-y-2">
                  <Label className="text-xs">Find a place in {regionInfo.label}</Label>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runSearch();
                    }}
                  >
                    <Input
                      value={query}
                      placeholder={region === "kerala" ? "e.g. Kondotty, Malappuram" : "e.g. Kozhikode or Hubballi"}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button type="submit" variant="secondary" disabled={searching || query.trim().length < 2}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </form>
                  {searchError && <p className="text-xs text-destructive">{searchError}</p>}
                  {results && !searchError && (
                    <div className="max-h-64 overflow-y-auto rounded-lg border">
                      {results.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          No places found{region === "kerala" ? " in Kerala" : ""}. Try a nearby town, or click the map to drop a pin.
                        </p>
                      ) : (
                        results.map((r, idx) => {
                          const area = ready ? locate(r.lat, r.lng) : { district: r.district || "", state: r.state || "" };
                          const off = ready && !pointInRegion(region, area);
                          const picked = pending && pending.lat === r.lat && pending.lng === r.lng;
                          return (
                            <button
                              key={`${r.lat},${r.lng},${idx}`}
                              type="button"
                              disabled={!ready}
                              onClick={() => choose(r)}
                              className={cn(
                                "flex w-full items-start gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/60",
                                picked && "bg-primary/5",
                              )}
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{r.name}</span>
                                <span className="line-clamp-2 text-xs text-muted-foreground">{r.address}</span>
                                {off && <span className="text-xs text-amber-700">Outside Kerala</span>}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Search by{" "}
                    <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                      OpenStreetMap
                    </a>
                    .
                  </p>
                </div>
              )}

              {pending && !disabled && (
                <div className="space-y-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">New location</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPending(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <div className="relative">
                      <Input
                        autoFocus
                        value={pending.name}
                        placeholder={pending.lookingUp ? "Looking up place…" : "Place name"}
                        onChange={(e) => setPending({ ...pending, name: e.target.value, focus: false })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!pendingOutside) addPending();
                          }
                        }}
                      />
                      {pending.lookingUp && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Note (optional)</Label>
                    <Textarea
                      rows={2}
                      value={pending.description || ""}
                      placeholder="What the project does here, e.g. 120 houses built"
                      onChange={(e) => setPending({ ...pending, description: e.target.value, focus: false })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {areaText(pending)} · {coords(pending)}
                  </p>
                  {pendingOutside && (
                    <p className="text-xs text-amber-700">
                      This place is outside Kerala. Switch the map to India to plot it.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!pending.name.trim() || pendingOutside || points.length >= MAX_POINTS}
                      onClick={addPending}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add to map
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs">Locations ({points.length})</Label>
                  {points.length >= MAX_POINTS && <span className="text-xs text-muted-foreground">Limit of {MAX_POINTS} reached</span>}
                </div>
                {points.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No locations yet. The map is only shown on the page once it has at least one location.
                  </p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {points.map((p, i) => {
                      const off = !pointInRegion(region, p);
                      return (
                        <div
                          key={p._id || `${i}-${p.lat}-${p.lng}`}
                          className={cn("rounded-lg border p-2", activeIndex === i && "border-primary ring-1 ring-primary/40")}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                off ? "bg-muted-foreground" : "bg-primary",
                              )}
                              style={!off && accent ? { backgroundColor: accent } : undefined}
                            >
                              {i + 1}
                            </span>
                            <Input
                              className="h-8"
                              disabled={disabled}
                              value={p.name}
                              onChange={(e) => updatePoint(i, { name: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              title="Show on map"
                              disabled={off}
                              onClick={() => setActiveIndex(i)}
                            >
                              <Crosshair className="h-4 w-4" />
                            </Button>
                            {!disabled && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                title="Remove"
                                onClick={() => removePoint(i)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <Input
                            className="mt-1.5 h-8 text-xs"
                            disabled={disabled}
                            placeholder="Note (optional)"
                            value={p.description || ""}
                            onChange={(e) => updatePoint(i, { description: e.target.value })}
                          />
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{areaText(p)}</span>
                            <span>· {coords(p)}</span>
                            {off && <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">Not on Kerala map</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
