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
import { projectPages } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import { ColorPicker } from '@/components/site/ColorPicker';
import { SectionsEditor, HeroEditor, ImageUploadField, stripSections } from '@/components/site/PageSectionsEditor';
import { categoryLabel } from '@/lib/siteProjects';
import { type SectionBackground, BACKGROUND_LABELS, IMAGE_SPECS, IMAGE_FORMAT_NOTE } from '@/types/sitePage';
import {
  type ProjectPage, type ProjectPageProject, type ProjectPageOverview,
  emptyProjectPage, PROJECT_STATUS_LABELS, PUBLIC_PROJECT_STATUSES,
} from '@/types/projectPage';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const OVERVIEW_TOGGLES: Array<{ key: keyof ProjectPageOverview; label: string; hint: string }> = [
  { key: 'showDates', label: 'Timeline', hint: 'Start and end month of the project.' },
  { key: 'showProgress', label: 'Progress', hint: 'Completion percentage from the project record.' },
  { key: 'showBeneficiaries', label: 'Beneficiaries', hint: 'Actual / estimated beneficiaries reached.' },
  { key: 'showBudget', label: 'Budget', hint: 'Total budget and amount spent. Off by default — turn on only if this is public information.' },
  { key: 'showMilestones', label: 'Milestones timeline', hint: 'Project milestones rendered as a timeline block.' },
];

export default function WebsiteProjectPageBuilder() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const canWrite = hasAnyPermission(['website.write']);
  const canDelete = hasAnyPermission(['website.delete']);

  const [project, setProject] = useState<ProjectPageProject | null>(null);
  const [page, setPage] = useState<ProjectPage | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res: any = await projectPages.getByProject(projectId as string);
        if (res.success) {
          const p: ProjectPageProject = res.data.project;
          setProject(p);
          setExists(!!res.data.page);
          setPage(res.data.page || { ...emptyProjectPage(p), slug: slugify(p.name) });
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to load project page', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const updatePage = (patch: Partial<ProjectPage>) => setPage((p) => (p ? { ...p, ...patch } : p));
  const updateOverview = (patch: Partial<ProjectPageOverview>) =>
    setPage((p) => (p ? { ...p, overview: { ...p.overview, ...patch } } : p));

  const handleSave = async () => {
    if (!page || !project) return;
    try {
      setSaving(true);
      const payload = {
        ...page,
        slug: slugify(page.slug || project.name),
        sections: stripSections(page.sections),
      };
      const res: any = await projectPages.save(project._id, payload);
      if (res.success) {
        toast({ title: 'Success', description: exists ? 'Project page updated' : 'Project page created' });
        setExists(true);
        setPage(res.data);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save project page', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      const res: any = await projectPages.delete(project._id);
      if (res.success) {
        toast({ title: 'Success', description: 'Project page deleted' });
        navigate('/website-project-pages');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete project page', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading project page...</div></div>;
  if (!project || !page) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/website-project-pages')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Project not found.</CardContent></Card>
      </div>
    );
  }

  const isPublicProject = PUBLIC_PROJECT_STATUSES.includes(project.status || '');
  const canView = exists && page.status === 'published' && isPublicProject && page.slug;
  const ov = page.overview;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/website-project-pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">/projects-hub/{page.slug || '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select disabled={!canWrite} value={page.status} onValueChange={(v) => updatePage({ status: v as ProjectPage['status'] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          {canView && (
            <Button variant="outline" onClick={() => window.open(`/projects-hub/${page.slug}`, '_blank')}>
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
        <CardHeader><CardTitle className="text-base">Project</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.code && <Badge variant="outline">{project.code}</Badge>}
            {project.category && <Badge variant="outline" className="capitalize">{categoryLabel(project.category)}</Badge>}
            <Badge variant={isPublicProject ? 'secondary' : 'destructive'}>
              {PROJECT_STATUS_LABELS[project.status || ''] || project.status}
            </Badge>
          </div>
          {project.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{project.description}</p>}
          <p className="text-xs text-muted-foreground">
            Name, code, category, status, dates and progress come from the project record (Projects module). Edit them there;
            this page controls only how the project is presented on the public website.
          </p>
          {!isPublicProject && (
            <p className="text-xs text-destructive">
              This project is {PROJECT_STATUS_LABELS[project.status || '']?.toLowerCase() || project.status}, so the public site hides it.
              You can build the page now; it goes live once the project is approved, active or completed and the page is published.
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
                <span className="text-sm text-muted-foreground shrink-0">/projects-hub/</span>
                <Input disabled={!canWrite} value={page.slug} onChange={(e) => updatePage({ slug: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Card Summary</Label>
              <Textarea
                rows={2}
                disabled={!canWrite}
                value={page.summary || ''}
                placeholder={project.description || 'Short text for the project card on the home page and projects hub'}
                onChange={(e) => updatePage({ summary: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to use the project description.</p>
            </div>
          </div>
          <div>
            <Label className="text-xs">Card Cover Image</Label>
            <ImageUploadField
              imageUrl={page.coverImageUrl}
              disabled={!canWrite}
              hint={`${IMAGE_SPECS.cards} Replaces the category stock photo on every project card. · ${IMAGE_FORMAT_NOTE}`}
              onUploaded={(url, key) => updatePage({ coverImageUrl: url, coverImageKey: key })}
              onRemove={() => updatePage({ coverImageUrl: '', coverImageKey: '' })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div>
              <Label className="text-xs">SEO Title</Label>
              <Input disabled={!canWrite} placeholder={project.name} value={page.seo?.title || ''} onChange={(e) => updatePage({ seo: { ...page.seo, title: e.target.value } })} />
            </div>
            <div>
              <Label className="text-xs">SEO Description</Label>
              <Input disabled={!canWrite} value={page.seo?.description || ''} onChange={(e) => updatePage({ seo: { ...page.seo, description: e.target.value } })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <HeroEditor hero={page.hero} disabled={!canWrite} titlePlaceholder={project.name} onChange={(hero) => updatePage({ hero })} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Project Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Show</Label>
              <Switch disabled={!canWrite} checked={ov.visible} onCheckedChange={(v) => updateOverview({ visible: v })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            An automatic "at a glance" block right under the hero: the project description plus live facts from the project record.
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
                  <Switch disabled={!canWrite} checked={!!ov[t.key]} onCheckedChange={(v) => updateOverview({ [t.key]: v } as Partial<ProjectPageOverview>)} />
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
            <AlertDialogTitle>Delete this project page?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the public page is removed — the project itself is untouched. This cannot be undone.
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
