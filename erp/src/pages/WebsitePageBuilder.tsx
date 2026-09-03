import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { sitePages } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import { SectionsEditor, HeroEditor, stripSections } from '@/components/site/PageSectionsEditor';
import type { SitePage } from '@/types/sitePage';

// ── helpers ──────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function emptyPage(): SitePage {
  return {
    title: '',
    slug: '',
    hero: { title: '', subtitle: '', imageUrl: '', imageKey: '' },
    sections: [],
    status: 'draft',
    showInNav: false,
    navLabel: '',
    navOrder: 0,
    showOnHome: false,
    homeOrder: 0,
    summary: '',
    seo: { title: '', description: '' },
  };
}

// ── main builder ─────────────────────────────────────────────────────────

export default function WebsitePageBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const canWrite = hasAnyPermission(['website.write']);

  const isNew = !id || id === 'new';
  const [page, setPage] = useState<SitePage>(emptyPage());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      setPage(emptyPage());
      setLoading(false);
      setSlugTouched(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res: any = await sitePages.getById(id as string);
        if (res.success) setPage(res.data);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to load page', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updatePage = (patch: Partial<SitePage>) => setPage((p) => ({ ...p, ...patch }));

  const handleTitleChange = (value: string) => {
    const patch: Partial<SitePage> = { title: value };
    if (isNew && !slugTouched) patch.slug = slugify(value);
    updatePage(patch);
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updatePage({ slug: value });
  };

  const handleSave = async () => {
    if (!page.title.trim()) {
      toast({ title: 'Validation Error', description: 'Page title is required', variant: 'destructive' });
      return;
    }
    if (!page.slug.trim()) {
      toast({ title: 'Validation Error', description: 'Page slug is required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...page,
        slug: slugify(page.slug),
        sections: stripSections(page.sections),
      };
      const res: any = isNew ? await sitePages.create(payload) : await sitePages.update(id as string, payload);
      if (res.success) {
        toast({ title: 'Success', description: isNew ? 'Page created' : 'Page updated' });
        if (isNew && res.data?._id) {
          navigate(`/website-pages/${res.data._id}`, { replace: true });
        } else {
          setPage(res.data);
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save page', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading page...</div></div>;

  const canView = !isNew && page.status === 'published' && page.slug;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/website-pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{isNew ? 'New Page' : page.title || 'Edit Page'}</h1>
            <p className="text-sm text-muted-foreground">/p/{page.slug || '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select disabled={!canWrite} value={page.status} onValueChange={(v) => updatePage({ status: v as SitePage['status'] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          {canView && (
            <Button variant="outline" onClick={() => window.open(`/p/${page.slug}`, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />View Page
            </Button>
          )}
          {canWrite && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Page Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input disabled={!canWrite} value={page.title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div>
              <Label>Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">/p/</span>
                <Input disabled={!canWrite} value={page.slug} onChange={(e) => handleSlugChange(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea rows={2} disabled={!canWrite} value={page.summary || ''} onChange={(e) => updatePage({ summary: e.target.value })} placeholder="Used on the landing page overview card" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show in navigation</Label>
                <Switch disabled={!canWrite} checked={page.showInNav} onCheckedChange={(v) => updatePage({ showInNav: v })} />
              </div>
              <div>
                <Label className="text-xs">Nav Label</Label>
                <Input disabled={!canWrite} value={page.navLabel || ''} onChange={(e) => updatePage({ navLabel: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Nav Order</Label>
                <Input type="number" disabled={!canWrite} value={page.navOrder ?? 0} onChange={(e) => updatePage({ navOrder: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show on home page</Label>
                <Switch disabled={!canWrite} checked={page.showOnHome} onCheckedChange={(v) => updatePage({ showOnHome: v })} />
              </div>
              <div>
                <Label className="text-xs">Home Order</Label>
                <Input type="number" disabled={!canWrite} value={page.homeOrder ?? 0} onChange={(e) => updatePage({ homeOrder: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div>
              <Label className="text-xs">SEO Title</Label>
              <Input disabled={!canWrite} value={page.seo?.title || ''} onChange={(e) => updatePage({ seo: { ...page.seo, title: e.target.value } })} />
            </div>
            <div>
              <Label className="text-xs">SEO Description</Label>
              <Input disabled={!canWrite} value={page.seo?.description || ''} onChange={(e) => updatePage({ seo: { ...page.seo, description: e.target.value } })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <HeroEditor hero={page.hero} disabled={!canWrite} onChange={(hero) => updatePage({ hero })} />

      <SectionsEditor sections={page.sections} disabled={!canWrite} onChange={(sections) => updatePage({ sections })} />
    </div>
  );
}
