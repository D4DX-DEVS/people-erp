import { useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  ExternalLink, Link2, RotateCcw, Sparkles, Wand2, SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SiteHeader } from "@/components/site/SiteHeader";
import { sitePages } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DESTINATION_GROUPS, BUTTON_ICONS, buildDefaultNavigation, findDestination, pageTarget,
  type NavigationSettings, type NavItem, type NavLink, type NavButton, type MenuAlignment,
} from "@/types/siteNavigation";

interface AdminPage {
  _id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  showInNav?: boolean;
  navLabel?: string;
  navOrder?: number;
}

interface NavigationBuilderProps {
  value: NavigationSettings;
  onChange: (next: NavigationSettings) => void;
  /** Resolved donate link (Donation payment link, else hero CTA) — drives the "Donate" destination. */
  donateLink?: string;
  disabled?: boolean;
  /** Brand palette CSS variables so the preview shows the site's colours. */
  themeStyle?: CSSProperties;
}

// ---- small list helpers -----------------------------------------------------

function moveIn<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
const patchAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] => arr.map((x, k) => (k === i ? { ...x, ...patch } : x));
const removeAt = <T,>(arr: T[], i: number): T[] => arr.filter((_, k) => k !== i);

const emptyLink = (): NavLink => ({ label: "", kind: "custom", target: "", visible: true });

/** Friendly one-liner for a collapsed row: where the link goes. */
function describeTarget(link: NavLink, pages: AdminPage[]): string {
  if (link.kind === "donate") return "Donate link";
  const page = pages.find((p) => pageTarget(p.slug) === link.target);
  if (page) return page.title;
  const dest = findDestination(link.target);
  if (dest) return dest.label;
  return link.target || "No destination yet";
}

/**
 * Admin-side editor for the public header: menu mode, link position, ordered
 * links with dropdown groups, and the action buttons — with a live preview.
 */
export function NavigationBuilder({ value, onChange, donateLink, disabled = false, themeStyle }: NavigationBuilderProps) {
  const { data: pages = [] } = useQuery({
    queryKey: ["site-pages-admin-nav"],
    queryFn: async () => {
      const res: any = await sitePages.getAll();
      return (res?.data || []) as AdminPage[];
    },
    staleTime: 60_000,
  });

  const publishedPages = useMemo(() => pages.filter((p) => p.status === "published"), [pages]);
  const defaults = useMemo(() => buildDefaultNavigation(publishedPages), [publishedPages]);

  const custom = value.customized;
  const items = value.items;
  const buttons = value.buttons;

  // What the preview shows: the custom config, or the automatic menu built from live pages.
  const previewNav: NavigationSettings = custom
    ? { ...value, customized: true }
    : { ...defaults, customized: true, menuAlignment: value.menuAlignment };

  const update = (patch: Partial<NavigationSettings>) => onChange({ ...value, ...patch });
  const setItems = (next: NavItem[]) => update({ items: next });
  const setButtons = (next: NavButton[]) => update({ buttons: next });

  const setMode = (mode: "auto" | "custom") => {
    if (mode === "custom") {
      // Start from what visitors see today so nothing disappears when switching.
      update({
        customized: true,
        items: items.length ? items : defaults.items,
        buttons: buttons.length ? buttons : defaults.buttons,
      });
    } else {
      update({ customized: false });
    }
  };

  const addLink = () => setItems([...items, { ...emptyLink(), type: "link", _expanded: true }]);
  const addDropdown = (children: NavLink[] = [], label = "") =>
    setItems([...items, { ...emptyLink(), type: "dropdown", label, children, _expanded: true }]);
  const addPagesDropdown = () =>
    addDropdown(
      publishedPages.map((p) => ({ label: p.navLabel || p.title, kind: "page", target: pageTarget(p.slug), visible: true })),
      "Our Pages",
    );
  const addPageLink = (p: AdminPage) =>
    setItems([...items, { type: "link", label: p.navLabel || p.title, kind: "page", target: pageTarget(p.slug), visible: true }]);
  const addButton = () => setButtons([...buttons, { ...emptyLink(), style: "outline", icon: "", _expanded: true }]);
  const setAllExpanded = (expanded: boolean) =>
    update({ items: items.map((i) => ({ ...i, _expanded: expanded })), buttons: buttons.map((b) => ({ ...b, _expanded: expanded })) });
  const resetToDefault = () => onChange({ ...defaults, customized: true, menuAlignment: value.menuAlignment });

  // Published pages nobody linked to yet — one click to add them.
  const missingPages = useMemo(() => {
    if (!custom) return [];
    const referenced = new Set<string>();
    items.forEach((i) => {
      referenced.add(i.target);
      (i.children || []).forEach((c) => referenced.add(c.target));
    });
    buttons.forEach((b) => referenced.add(b.target));
    return publishedPages.filter((p) => !referenced.has(pageTarget(p.slug)));
  }, [custom, items, buttons, publishedPages]);

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Live preview</Label>
          <span className="text-xs text-muted-foreground">Desktop layout · hover a dropdown to open it · changes go live when you save</span>
        </div>
        <div className="rounded-xl bg-muted/40 p-3" style={themeStyle}>
          <SiteHeader preview navigation={previewNav} donateLink={donateLink} />
        </div>
      </div>

      {/* Mode + position */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Menu links</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={custom ? "custom" : "auto"}
            onValueChange={(v) => v && !disabled && setMode(v as "auto" | "custom")}
          >
            <ToggleGroupItem value="auto" className="gap-1.5" disabled={disabled}>
              <Wand2 className="h-3.5 w-3.5" /> Automatic
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" className="gap-1.5" disabled={disabled}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Custom
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {custom
              ? "You decide every link, its label and its order. New pages are not added by themselves — add them below."
              : "Built-in links plus every published page marked “Show in menu”. Switch to Custom to rename, reorder, hide, or group links into dropdown menus."}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Menu position</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={value.menuAlignment}
            onValueChange={(v) => v && !disabled && update({ menuAlignment: v as MenuAlignment })}
          >
            <ToggleGroupItem value="left" disabled={disabled}>Next to logo</ToggleGroupItem>
            <ToggleGroupItem value="center" disabled={disabled}>Centered</ToggleGroupItem>
            <ToggleGroupItem value="right" disabled={disabled}>Next to buttons</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">Where the links sit between the logo and the action buttons on wide screens.</p>
        </div>
      </div>

      {custom && (
        <>
          {/* Menu links */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Menu links</h3>
                <p className="text-xs text-muted-foreground">
                  Shown left to right in this order. A dropdown groups several pages under one label.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllExpanded(true)}>
                  <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" /> Expand all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllExpanded(false)}>
                  <ChevronsDownUp className="mr-1.5 h-3.5 w-3.5" /> Collapse all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetToDefault} disabled={disabled}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to default menu
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Click a row to open it for editing; click again to tuck it away.</p>

            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                No links yet. Add a link or a dropdown menu below.
              </p>
            )}

            {items.map((item, i) => (
              <ItemRow
                key={item._id || `item-${i}`}
                item={item}
                index={i}
                count={items.length}
                pages={pages}
                disabled={disabled}
                onChange={(next) => setItems(patchAt(items, i, next))}
                onMove={(dir) => setItems(moveIn(items, i, dir))}
                onRemove={() => setItems(removeAt(items, i))}
              />
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addLink} disabled={disabled}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add link
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addDropdown()} disabled={disabled}>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> Add dropdown menu
              </Button>
              {publishedPages.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={addPagesDropdown} disabled={disabled}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Add a dropdown with all your pages
                </Button>
              )}
            </div>

            {missingPages.length > 0 && (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Published pages not in your menu yet — click to add</p>
                <div className="flex flex-wrap gap-2">
                  {missingPages.map((p) => (
                    <Button
                      key={p._id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 rounded-full text-xs"
                      onClick={() => addPageLink(p)}
                      disabled={disabled}
                    >
                      <Plus className="mr-1 h-3 w-3" /> {p.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Action buttons */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Action buttons</h3>
              <p className="text-xs text-muted-foreground">
                Highlighted buttons at the right of the bar, such as Donate or Login. Filled = main action, Outline = secondary.
              </p>
            </div>

            {buttons.length === 0 && (
              <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                No buttons. Add one below, e.g. Donate or Login.
              </p>
            )}

            {buttons.map((b, i) => (
              <ButtonRow
                key={b._id || `btn-${i}`}
                button={b}
                index={i}
                count={buttons.length}
                pages={pages}
                disabled={disabled}
                onChange={(next) => setButtons(patchAt(buttons, i, next))}
                onMove={(dir) => setButtons(moveIn(buttons, i, dir))}
                onRemove={() => setButtons(removeAt(buttons, i))}
              />
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={disabled}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add button
            </Button>
          </section>
        </>
      )}
    </div>
  );
}

// ---- rows -------------------------------------------------------------------

interface RowActionsProps {
  index: number;
  count: number;
  visible: boolean;
  disabled: boolean;
  onToggleVisible: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function RowActions({ index, count, visible, disabled, onToggleVisible, onMove, onRemove }: RowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button" variant="ghost" size="icon" className="h-7 w-7"
        title={visible ? "Hide on website" : "Show on website"}
        disabled={disabled} onClick={onToggleVisible}
      >
        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move left / up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Move right / down" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Remove" disabled={disabled} onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

interface ItemRowProps {
  item: NavItem;
  index: number;
  count: number;
  pages: AdminPage[];
  disabled: boolean;
  onChange: (next: Partial<NavItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function ItemRow({ item, index, count, pages, disabled, onChange, onMove, onRemove }: ItemRowProps) {
  const isDropdown = item.type === "dropdown";
  const children = item.children || [];
  const visible = item.visible !== false;
  const expanded = item._expanded === true;
  const setChildren = (next: NavLink[]) => onChange({ children: next });

  return (
    <div className={cn("space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3", !visible && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange({ _expanded: !expanded })}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:bg-muted/60"
        >
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium">
            {item.label || <span className="font-normal italic text-muted-foreground">Untitled</span>}
          </span>
          <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
            {isDropdown ? <ChevronDown className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
            {isDropdown ? `Dropdown · ${children.length} link${children.length === 1 ? "" : "s"}` : "Link"}
          </Badge>
          {!isDropdown && (
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{describeTarget(item, pages)}</span>
          )}
          {!isDropdown && item.openInNewTab && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
          {!visible && <Badge variant="outline" className="shrink-0 font-normal">Hidden</Badge>}
        </button>
        <RowActions
          index={index} count={count} visible={visible} disabled={disabled}
          onToggleVisible={() => onChange({ visible: !visible })} onMove={onMove} onRemove={onRemove}
        />
      </div>

      {expanded && (
      <div className="grid gap-3 md:grid-cols-[1fr_170px_1.4fr]">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={item.label}
            placeholder={isDropdown ? "e.g. Our Work" : "e.g. About Us"}
            disabled={disabled}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={item.type} onValueChange={(v) => onChange({ type: v as NavItem["type"] })} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="dropdown">Dropdown menu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isDropdown ? (
          <div className="hidden md:block" />
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Goes to</Label>
            <LinkPicker link={item} pages={pages} disabled={disabled} onChange={(patch) => onChange(patch)} />
          </div>
        )}
      </div>

      )}

      {expanded && !isDropdown && (
        <NewTabCheckbox id={`item-${index}-newtab`} checked={!!item.openInNewTab} disabled={disabled} onChange={(v) => onChange({ openInNewTab: v })} />
      )}

      {expanded && isDropdown && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
          <p className="text-xs font-medium text-muted-foreground">Links inside this dropdown</p>
          {children.length === 0 && (
            <p className="text-xs text-muted-foreground">An empty dropdown is not shown on the website — add at least one link.</p>
          )}
          {children.map((c, j) => (
            <ChildRow
              key={c._id || `child-${j}`}
              link={c}
              index={j}
              count={children.length}
              pages={pages}
              disabled={disabled}
              onChange={(patch) => setChildren(patchAt(children, j, patch))}
              onMove={(dir) => setChildren(moveIn(children, j, dir))}
              onRemove={() => setChildren(removeAt(children, j))}
            />
          ))}
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setChildren([...children, emptyLink()])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add link to dropdown
          </Button>
        </div>
      )}
    </div>
  );
}

interface ChildRowProps {
  link: NavLink;
  index: number;
  count: number;
  pages: AdminPage[];
  disabled: boolean;
  onChange: (next: Partial<NavLink>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function ChildRow({ link, index, count, pages, disabled, onChange, onMove, onRemove }: ChildRowProps) {
  const visible = link.visible !== false;
  return (
    <div className={cn("space-y-2 rounded-md border border-border/50 bg-muted/20 p-2", !visible && "opacity-60")}>
      <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={link.label} placeholder="e.g. Our Team" disabled={disabled} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Goes to</Label>
          <LinkPicker link={link} pages={pages} disabled={disabled} onChange={onChange} />
        </div>
        <RowActions
          index={index} count={count} visible={visible} disabled={disabled}
          onToggleVisible={() => onChange({ visible: !visible })} onMove={onMove} onRemove={onRemove}
        />
      </div>
      <NewTabCheckbox id={`child-${index}-${link._id || ""}-newtab`} checked={!!link.openInNewTab} disabled={disabled} onChange={(v) => onChange({ openInNewTab: v })} />
    </div>
  );
}

interface ButtonRowProps {
  button: NavButton;
  index: number;
  count: number;
  pages: AdminPage[];
  disabled: boolean;
  onChange: (next: Partial<NavButton>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function ButtonRow({ button, index, count, pages, disabled, onChange, onMove, onRemove }: ButtonRowProps) {
  const visible = button.visible !== false;
  const expanded = button._expanded === true;
  return (
    <div className={cn("space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3", !visible && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange({ _expanded: !expanded })}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:bg-muted/60"
        >
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium">
            {button.label || <span className="font-normal italic text-muted-foreground">Untitled</span>}
          </span>
          <Badge variant="secondary" className="shrink-0 font-normal">{button.style === "outline" ? "Outline button" : "Filled button"}</Badge>
          <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{describeTarget(button, pages)}</span>
          {button.openInNewTab && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
          {!visible && <Badge variant="outline" className="shrink-0 font-normal">Hidden</Badge>}
        </button>
        <RowActions
          index={index} count={count} visible={visible} disabled={disabled}
          onToggleVisible={() => onChange({ visible: !visible })} onMove={onMove} onRemove={onRemove}
        />
      </div>

      {expanded && (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_150px_150px]">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={button.label} placeholder="e.g. Donate" disabled={disabled} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Goes to</Label>
          <LinkPicker link={button} pages={pages} disabled={disabled} allowDonate onChange={onChange} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Style</Label>
          <Select value={button.style} onValueChange={(v) => onChange({ style: v as NavButton["style"] })} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Filled (main action)</SelectItem>
              <SelectItem value="outline">Outline (secondary)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon</Label>
          <Select value={button.icon || "none"} onValueChange={(v) => onChange({ icon: v === "none" ? "" : v })} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No icon</SelectItem>
              {BUTTON_ICONS.map((ic) => (
                <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      )}

      {expanded && (
        <NewTabCheckbox id={`btn-${index}-newtab`} checked={!!button.openInNewTab} disabled={disabled} onChange={(v) => onChange({ openInNewTab: v })} />
      )}
    </div>
  );
}

function NewTabCheckbox({ id, checked, disabled, onChange }: { id: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">Open in a new tab</Label>
    </div>
  );
}

// ---- destination picker -----------------------------------------------------

const CUSTOM = "__custom";
const DONATE = "__donate";

interface LinkPickerProps {
  link: NavLink;
  pages: AdminPage[];
  disabled: boolean;
  /** Offer the "Donate link" destination (action buttons). */
  allowDonate?: boolean;
  onChange: (patch: Partial<NavLink>) => void;
}

/** One dropdown listing everything a link can point to, with a free-form URL fallback. */
function LinkPicker({ link, pages, disabled, allowDonate = false, onChange }: LinkPickerProps) {
  const knownPage = pages.find((p) => pageTarget(p.slug) === link.target);
  const known = findDestination(link.target);

  let selected: string;
  if (link.kind === "donate") selected = DONATE;
  else if (link.kind === "custom") selected = CUSTOM;
  else if (known || knownPage) selected = link.target;
  else selected = CUSTOM;

  const handleSelect = (v: string) => {
    if (v === CUSTOM) {
      onChange({ kind: "custom", target: link.kind === "custom" ? link.target : "" });
      return;
    }
    if (v === DONATE) {
      onChange({ kind: "donate", target: "", label: link.label || "Donate", openInNewTab: true });
      return;
    }
    const page = pages.find((p) => pageTarget(p.slug) === v);
    if (page) {
      onChange({ kind: "page", target: v, label: link.label || page.navLabel || page.title });
      return;
    }
    const dest = findDestination(v);
    if (dest) onChange({ kind: dest.kind, target: dest.value, label: link.label || dest.short });
  };

  return (
    <div className="space-y-2">
      <Select value={selected} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder="Choose where it goes" /></SelectTrigger>
        <SelectContent className="max-h-80">
          {DESTINATION_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
          {pages.length > 0 && (
            <SelectGroup>
              <SelectLabel>Your custom pages</SelectLabel>
              {pages.map((p) => (
                <SelectItem key={p._id} value={pageTarget(p.slug)}>
                  {p.title}{p.status === "draft" ? " (draft — not visible yet)" : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          <SelectGroup>
            <SelectLabel>Other</SelectLabel>
            {allowDonate && <SelectItem value={DONATE}>Donate link (from Donation settings)</SelectItem>}
            <SelectItem value={CUSTOM}>Custom URL…</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {selected === CUSTOM && (
        <Input
          value={link.target}
          placeholder="https://example.org, /some-path or mailto:hello@example.org"
          disabled={disabled}
          onChange={(e) => onChange({ kind: "custom", target: e.target.value })}
        />
      )}
      {selected === DONATE && (
        <p className="text-xs text-muted-foreground">Uses the payment link from the Donation section below. Hidden while that link is empty.</p>
      )}
    </div>
  );
}
