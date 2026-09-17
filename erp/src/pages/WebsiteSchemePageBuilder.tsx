import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { schemePages } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import { ColorPicker } from '@/components/site/ColorPicker';
import { SectionsEditor, HeroEditor, ImageUploadField, stripSections } from '@/components/site/PageSectionsEditor';
import { type SectionBackground, BACKGROUND_LABELS, IMAGE_SPECS, IMAGE_FORMAT_NOTE } from '@/types/sitePage';
import {
  type SchemePage, type SchemePageScheme, type SchemePageOverview,
  emptySchemePage, SCHEME_STATUS_LABELS, PUBLIC_SCHEME_STATUSES,
} from '@/types/schemePage';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const OVERVIEW_TOGGLES: Array<{ key: keyof SchemePageOverview; label: string; hint: string }> = [
  { key: 'showCategory', label: 'Category', hint: 'The scheme category, shown as a fact tile.' },
  { key: 'showDates', label: 'Application deadline', hint: 'The closing date from the scheme record.' },
  { key: 'showBeneficiaries', label: 'Beneficiaries', hint: 'How many people the scheme has reached, against its target.' },
  { key: 'showBudget', label: 'Budget', hint: 'Total scheme budget. Off by default — turn on only if this is public information.' },
  { key: 'showEligibility', label: 'Who can apply', hint: 'Age, income, family size and other eligibility rules as cards.' },
  { key: 'showDocuments', label: 'Documents needed', hint: 'The documents an applicant must have ready.' },
];

export default function WebsiteSchemePageBuilder() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const canWrite = hasAnyPermission(['website.write']);
  const canDelete = hasAnyPermission(['website.delete']);

  const [scheme, setScheme] = useState<SchemePageScheme | null>(null);
  const [page, setPage] = useState<SchemePage | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res: any = await schemePages.getByScheme(schemeId as string);
        if (res.success) {
          const s: SchemePageScheme = res.data.scheme;
          setScheme(s);
          setExists(!!res.data.page);
          setPage(res.data.page || { ...emptySchemePage(s), slug: slugify(s.name || s.title || '') });
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to load scheme page', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeId]);

  const updatePage = (patch: Partial<SchemePage>) => setPage((p) => (p ? { ...p, ...patch } : p));
  const updateOverview = (patch: Partial<SchemePageOverview>) =>
    setPage((p) => (p ? { ...p, overview: { ...p.overview, ...patch } } : p));

  const handleSave = async () => {
    if (!page || !scheme) return;
    try {
      setSaving(true);
      const payload = {
        ...page,
        slug: slugify(page.slug || scheme.name || scheme.title || ''),
        sections: stripSections(page.sections),
      };
      const res: any = await schemePages.save(scheme._id, payload);
      if (res.success) {
        toast({ title: 'Success', description: exists ? 'Scheme page updated' : 'Scheme page created' });
        setExists(true);
        setPage(res.data);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save scheme page', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!scheme) return;
    try {
      const res: any = await schemePages.delete(scheme._id);
      if (res.success) {
        toast({ title: 'Success', description: 'Scheme page deleted' });
        navigate('/website-scheme-pages');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete scheme page', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading scheme page...</div></div>;
  if (!scheme || !page) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/website-scheme-pages')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Scheme not found.</CardContent></Card>
      </div>
    );
  }

  const name = scheme.name || scheme.title || 'Untitled scheme';
  const isPublicScheme = PUBLIC_SCHEME_STATUSES.includes(scheme.status || '');
  // Unlike projects, there is always a live page to view: an unpublished or
  // absent record just means visitors get the automatic one.
  const livePath = `/schemes/${exists && page.status === 'published' ? page.slug : slugify(name)}`;
  const ov = page.overview;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/website-scheme-pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">{livePath}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select disabled={!canWrite} value={page.status} onValueChange={(v) => updatePage({ status: v as SchemePage['status'] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          {isPublicScheme && (
            <Button variant="outline" onClick={() => window.open(livePath, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />View Page
            </Button>
          )}
          {canDelete && exists && (
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />Delete
            </Button>
          )}
          {canWrite && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : exists ? 'Save' : 'Create Page'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Scheme</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {scheme.code && <Badge variant="outline">{scheme.code}</Badge>}
            {scheme.category && <Badge variant="outline" className="capitalize">{scheme.category.replace(/_/g, ' ')}</Badge>}
            <Badge variant={isPublicScheme ? 'secondary' : 'destructive'}>
              {SCHEME_STATUS_LABELS[scheme.status || ''] || scheme.status}
            </Badge>
          </div>
          {scheme.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{scheme.description}</p>}
          <p className="text-xs text-muted-foreground">
            Name, code, category, status, benefit, budget, dates and eligibility come from the scheme record (Schemes module).
            Edit them there; this page controls only how the scheme is presented on the public website.
          </p>
          {!exists && (
            <p className="text-xs text-muted-foreground">
              This scheme has no custom page yet, so visitors currently see the automatic one built from the record above.
              Saving here replaces it — publish when you're ready.
            </p>
          )}
          {!isPublicScheme && (
            <p className="text-xs text-destructive">
              This scheme is {SCHEME_STATUS_LABELS[scheme.status || '']?.toLowerCase() || scheme.status}, so the public site hides it.
              You can build the page now; it goes live once the scheme is active.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Page Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">/schemes/</span>
                <Input disabled={!canWrite} value={page.slug} onChange={(e) => updatePage({ slug: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Card Summary</Label>
              <Textarea
                rows={2}
                disabled={!canWrite}
                value={page.summary || ''}
                placeholder={scheme.description || 'Short text for the scheme card on the home page and schemes list'}
                onChange={(e) => updatePage({ summary: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to use the scheme description.</p>
            </div>
          </div>
          <div>
            <Label className="text-xs">Card Cover Image</Label>
            <ImageUploadField
              imageUrl={page.coverImageUrl}
              disabled={!canWrite}
              hint={`${IMAGE_SPECS.cards} Replaces the category artwork on every scheme card. · ${IMAGE_FORMAT_NOTE}`}
              onUploaded={(url, key) => updatePage({ coverImageUrl: url, coverImageKey: key })}
              onRemove={() => updatePage({ coverImageUrl: '', coverImageKey: '' })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div>
              <Label className="text-xs">SEO Title</Label>
              <Input disabled={!canWrite} placeholder={name} value={page.seo?.title || ''} onChange={(e) => updatePage({ seo: { ...page.seo, title: e.target.value } })} />
            </div>
            <div>
              <Label className="text-xs">SEO Description</Label>
              <Input disabled={!canWrite} value={page.seo?.description || ''} onChange={(e) => updatePage({ seo: { ...page.seo, description: e.target.value } })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <HeroEditor hero={page.hero} disabled={!canWrite} titlePlaceholder={name} onChange={(hero) => updatePage({ hero })} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Scheme Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Show</Label>
              <Switch disabled={!canWrite} checked={ov.visible} onCheckedChange={(v) => updateOverview({ visible: v })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            An automatic block right under the hero: the scheme description, live facts from the record, who can apply and
            which documents are needed.
          </p>
        </CardHeader>
        {ov.visible && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OVERVIEW_TOGGLES.map((t) => (
                <div key={t.key} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                  <div>
                    <Label className="text-sm">{t.label}</Label>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </div>
                  <Switch disabled={!canWrite} checked={!!ov[t.key]} onCheckedChange={(v) => updateOverview({ [t.key]: v } as Partial<SchemePageOverview>)} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
              <div>
                <Label className="text-xs">Accent colour</Label>
                <ColorPicker value={ov.accentColor} defaultLabel="Brand colour" disabled={!canWrite} onChange={(v) => updateOverview({ accentColor: v })} />
              </div>
              <div>
                <Label className="text-xs">Background</Label>
                <Select disabled={!canWrite} value={ov.background || 'muted'} onValueChange={(v) => updateOverview({ background: v as SectionBackground })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BACKGROUND_LABELS) as SectionBackground[]).map((val) => (
                      <SelectItem key={val} value={val}>{BACKGROUND_LABELS[val]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ov.background === 'custom' && (
                <div>
                  <Label className="text-xs">Background colour</Label>
                  <ColorPicker value={ov.backgroundColor} allowDefault={false} disabled={!canWrite} onChange={(v) => updateOverview({ backgroundColor: v })} />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <SectionsEditor sections={page.sections} disabled={!canWrite} onChange={(sections) => updatePage({ sections })} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scheme page?</AlertDialogTitle>
            <AlertDialogDescription>
              The custom page is removed and the scheme falls back to the automatic page built from its own record.
              The scheme itself is untouched. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
