import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, Edit2, ExternalLink, HandHeart, Loader2, Plus, Sparkles, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { sitePages, website } from '@/lib/api';
import { localiseTarget } from '@/lib/siteNav';
import type { SitePage } from '@/types/sitePage';
import {
  buildDefaultNavigation, normalizeNavigation, type NavItem, type NavLink, type NavigationSettings,
} from '@/types/siteNavigation';
import {
  GET_INVOLVED_DEFAULT_PAGES, defaultGetInvolvedItem, findGetInvolved, pagePath, withGetInvolved,
} from '@/types/getInvolved';

const CUSTOM = '__custom__';

/**
 * Manages the header's "Get Involved" dropdown from the Website Pages screen:
 * its label, and each entry's label, page, visibility and order. Entries open
 * ordinary site pages, so their content is edited in the page builder.
 * Writes WebsiteSettings.navigation (the same data as Website Settings →
 * Header & Navigation), replacing only this one dropdown.
 */
export function GetInvolvedMenu({
  pages, canWrite, onPagesCreated,
}: {
  pages: SitePage[];
  canWrite: boolean;
  onPagesCreated: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nav, setNav] = useState<NavigationSettings | null>(null);
  const [draft, setDraft] = useState<NavItem | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmSetup, setConfirmSetup] = useState(false);

  const slugs = useMemo(() => pages.map((p) => p.slug.toLowerCase()), [pages]);
  const pageByPath = useMemo(() => new Map(pages.map((p) => [pagePath(p.slug), p])), [pages]);
  const pathOf = (target: string) => localiseTarget(target || '', slugs).replace(/\/+$/, '');

  const load = async () => {
    try {
      const res: any = await website.getSettings();
      const stored = normalizeNavigation(res?.data?.settings?.navigation);
      setNav(stored);
      const base = stored.customized ? stored : buildDefaultNavigation(pages);
      const at = findGetInvolved(base.items);
      const found = at >= 0 ? base.items[at] : null;
      setDraft(found ? { ...found, type: 'dropdown', children: found.type === 'dropdown' ? (found.children || []) : [] } : null);
      setDirty(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load the menu', variant: 'destructive' });
    }
  };

  // Load once the page list is known (the automatic menu is built from it).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const children = draft?.children || [];
  const missingDefaults = GET_INVOLVED_DEFAULT_PAGES.filter((d) => !slugs.includes(d.slug));

  const edit = (patch: Partial<NavItem>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setDirty(true); };
  const editChild = (i: number, patch: Partial<NavLink>) =>
    edit({ children: children.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const moveChild = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= children.length) return;
    const next = children.slice();
    [next[i], next[j]] = [next[j], next[i]];
    edit({ children: next });
  };
  const removeChild = (i: number) => edit({ children: children.filter((_, idx) => idx !== i) });
  const addChild = () => edit({ children: [...children, { label: '', kind: 'page', target: '', visible: true }] });

  const persist = async (item: NavItem) => {
    if (!nav) return false;
    const base = nav.customized ? nav : { ...buildDefaultNavigation(pages), menuAlignment: nav.menuAlignment };
    const next = withGetInvolved(base, item);
    const res: any = await website.updateSettings({
      navigation: {
        ...next,
        items: next.items.map(({ _expanded, ...i }) => i),
        buttons: next.buttons.map(({ _expanded, ...b }) => b),
      },
    });
    if (!res?.success) return false;
    setNav(normalizeNavigation(res.data?.settings?.navigation || next));
    setDirty(false);
    return true;
  };

  const handleSave = async () => {
    if (!draft) return;
    const blank = children.find((c) => !c.label.trim() || !c.target.trim());
    if (blank) {
      toast({ title: 'Incomplete entry', description: 'Every entry needs a label and a page (or link).', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (await persist(draft)) toast({ title: 'Saved', description: 'Get Involved menu updated on the website header' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save the menu', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  /**
   * Create the default pages that don't exist yet, then point the menu at
   * them: an entry whose label matches a default page is re-pointed (menus
   * saved earlier sent Volunteering etc. to a home-page anchor), the rest are
   * appended. Saves the menu in the same step.
   */
  const handleSetup = async () => {
    setConfirmSetup(false);
    try {
      setCreating(true);
      for (const p of missingDefaults) {
        await sitePages.create({ ...p, status: 'published', showInNav: false, showOnHome: false });
      }
      const base: NavItem = draft || defaultGetInvolvedItem();
      const list = (draft ? children : []).slice();
      GET_INVOLVED_DEFAULT_PAGES.forEach((p) => {
        const target = pagePath(p.slug);
        const names = [p.navLabel, p.title].filter(Boolean).map((n) => n!.toLowerCase());
        const at = list.findIndex((c) => pathOf(c.target) === target || names.includes(c.label.trim().toLowerCase()));
        if (at >= 0) list[at] = { ...list[at], kind: 'page', target, openInNewTab: false };
        else list.push({ label: p.navLabel || p.title, kind: 'page', target, visible: true });
      });
      const item = { ...base, children: list };
      setDraft(item);
      await persist(item);
      onPagesCreated();
      toast({
        title: 'Get Involved pages ready',
        description: missingDefaults.length
          ? `Created ${missingDefaults.map((p) => p.title).join(', ')} and linked them in the menu.`
          : 'The menu now points at the Get Involved pages.',
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to set up the pages', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  if (!nav) {
    return <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading Get Involved menu…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HandHeart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Get Involved menu</CardTitle>
              <p className="text-sm text-muted-foreground">
                The “Get Involved” dropdown in the website header. Each entry opens its own page — edit the page content with the builder.
              </p>
            </div>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {(missingDefaults.length > 0 || !draft) && (
                <Button variant="outline" size="sm" disabled={creating} onClick={() => setConfirmSetup(true)}>
                  {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  Create default pages
                </Button>
              )}
              {draft && (
                <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
                  {saving ? 'Saving…' : 'Save menu'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!nav.customized && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            The header uses the automatic menu. Saving here switches it to a custom menu (Website Settings → Header &amp; Navigation)
            that includes this dropdown.
          </p>
        )}

        {!draft ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            The header has no Get Involved dropdown yet. Use <strong>Create default pages</strong> to add Volunteering,
            Internship, Career and Contact Us pages and link them in the menu.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="max-w-sm">
                <Label className="text-xs">Menu label</Label>
                <Input disabled={!canWrite} value={draft.label} maxLength={60} onChange={(e) => edit({ label: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Label className="text-xs">Show in header</Label>
                <Switch disabled={!canWrite} checked={draft.visible !== false} onCheckedChange={(v) => edit({ visible: v })} />
              </div>
            </div>

            <div className="space-y-2">
              {children.length === 0 && (
                <p className="text-sm text-muted-foreground">No entries — the dropdown is hidden until it has at least one.</p>
              )}
              {children.map((c, i) => {
                const path = pathOf(c.target);
                const page = pageByPath.get(path);
                const isCustom = !!c.target && !page;
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canWrite || i === 0} onClick={() => moveChild(i, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canWrite || i === children.length - 1} onClick={() => moveChild(i, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      className="lg:w-44"
                      placeholder="Button label"
                      disabled={!canWrite}
                      value={c.label}
                      maxLength={60}
                      onChange={(e) => editChild(i, { label: e.target.value })}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                      <Select
                        disabled={!canWrite}
                        value={page ? path : isCustom || c.kind === 'custom' ? CUSTOM : ''}
                        onValueChange={(v) => {
                          if (v === CUSTOM) { editChild(i, { kind: 'custom', target: isCustom ? c.target : '' }); return; }
                          const picked = pageByPath.get(v);
                          editChild(i, { kind: 'page', target: v, openInNewTab: false, label: c.label || picked?.navLabel || picked?.title || '' });
                        }}
                      >
                        <SelectTrigger className="sm:w-64"><SelectValue placeholder="Choose a page…" /></SelectTrigger>
                        <SelectContent>
                          {pages.map((p) => (
                            <SelectItem key={p._id} value={pagePath(p.slug)}>
                              {p.title}{p.status !== 'published' ? ' (draft)' : ''}
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM}>Other link…</SelectItem>
                        </SelectContent>
                      </Select>
                      {(isCustom || (c.kind === 'custom' && !page)) && (
                        <Input
                          className="min-w-0 flex-1"
                          placeholder="/path, /#section or https://…"
                          disabled={!canWrite}
                          value={c.target}
                          onChange={(e) => editChild(i, { kind: 'custom', target: e.target.value })}
                        />
                      )}
                      {page && page.status !== 'published' && (
                        <Badge variant="outline" className="self-start border-amber-300 text-amber-700 sm:self-center">Draft — hidden from visitors</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="mr-1 flex items-center gap-1.5">
                        <Switch disabled={!canWrite} checked={c.visible !== false} onCheckedChange={(v) => editChild(i, { visible: v })} />
                        <span className="text-xs text-muted-foreground">Visible</span>
                      </div>
                      {page?._id && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Edit page content" onClick={() => navigate(`/website-pages/${page._id}`)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {page?.status === 'published' && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="View page" onClick={() => window.open(path, '_blank')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Remove entry" onClick={() => removeChild(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {canWrite && (
                <Button type="button" variant="outline" size="sm" onClick={addChild}>
                  <Plus className="mr-1.5 h-4 w-4" />Add entry
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmSetup} onOpenChange={setConfirmSetup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Get Involved pages?</AlertDialogTitle>
            <AlertDialogDescription>
              {missingDefaults.length
                ? `This publishes starter pages for ${missingDefaults.map((p) => p.title).join(', ')} with basic content you can edit, `
                : 'All default pages already exist. This '}
              and points the Get Involved menu entries at them. Existing pages are left untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSetup}>Create &amp; link</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
