import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, FolderKanban, Search, Plus, ListOrdered, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { projectPages } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import { categoryLabel } from '@/lib/siteProjects';
import { ProjectOrderEditor } from '@/components/site/ProjectOrderEditor';
import { PANEL_COUNT } from '@/components/site/ProjectsShowcase';
import { type ProjectPageProject, type ProjectPageRow, PROJECT_STATUS_LABELS, PUBLIC_PROJECT_STATUSES } from '@/types/projectPage';

type Filter = 'all' | 'published' | 'draft' | 'none';

export default function WebsiteProjectPages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const [rows, setRows] = useState<ProjectPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<ProjectPageRow | null>(null);
  // "Arrange order" works on a copy of the list, so Cancel leaves the saved order untouched.
  const [arranging, setArranging] = useState(false);
  const [draftOrder, setDraftOrder] = useState<ProjectPageProject[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const canWrite = hasAnyPermission(['website.write']);
  const canDelete = hasAnyPermission(['website.delete']);

  useEffect(() => { fetchRows(); }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res: any = await projectPages.getAll();
      if (res.success) setRows(res.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to fetch project pages', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const startArranging = () => {
    setDraftOrder(rows.map((r) => r.project));
    setArranging(true);
  };

  const orderChanged = arranging && draftOrder.some((p, i) => p._id !== rows[i]?.project._id);

  const saveOrder = async () => {
    try {
      setSavingOrder(true);
      const res: any = await projectPages.reorder(draftOrder.map((p) => p._id));
      if (res.success) {
        toast({ title: 'Success', description: 'Project order saved' });
        setArranging(false);
        await fetchRows();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save project order', variant: 'destructive' });
    } finally { setSavingOrder(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res: any = await projectPages.delete(deleting.project._id);
      if (res.success) {
        toast({ title: 'Success', description: 'Project page deleted' });
        setDeleting(null);
        fetchRows();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete project page', variant: 'destructive' });
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'none' && r.page) return false;
      if ((filter === 'published' || filter === 'draft') && r.page?.status !== filter) return false;
      if (!q) return true;
      return r.project.name.toLowerCase().includes(q) || (r.project.code || '').toLowerCase().includes(q);
    });
  }, [rows, search, filter]);

  // Position of each project in the saved order — what the public site follows.
  const rank = useMemo(() => new Map(rows.map((r, i) => [r.project._id, i + 1])), [rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    published: rows.filter((r) => r.page?.status === 'published').length,
    draft: rows.filter((r) => r.page?.status === 'draft').length,
    none: rows.filter((r) => !r.page).length,
  }), [rows]);

  const pageBadge = (row: ProjectPageRow) => {
    if (!row.page) return <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">No page</span>;
    const cls = row.page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    return <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{row.page.status}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading projects...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Project Pages</h1>
          <p className="text-muted-foreground mt-1">Build a detailed public page for each project — hero, overview, sections, gallery and more</p>
        </div>
        {canWrite && rows.length > 1 && !arranging && (
          <Button variant="outline" onClick={startArranging}>
            <ListOrdered className="h-4 w-4 mr-2" />Arrange order
          </Button>
        )}
      </div>

      {arranging && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Arrange project order</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  The project at the top is shown first on the website — in the home page's Our Projects strip (which shows the
                  first {PANEL_COUNT}) and on the Projects page. Drag the handle, use the arrows, or type a position.
                  New projects go to the end until you place them.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={savingOrder} onClick={() => setArranging(false)}>Cancel</Button>
                <Button disabled={!orderChanged || savingOrder} onClick={saveOrder}>
                  {savingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save order
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProjectOrderEditor value={draftOrder} onChange={setDraftOrder} disabled={savingOrder} />
          </CardContent>
        </Card>
      )}

      {!arranging && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {(['all', 'published', 'draft', 'none'] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setFilter(f)}>
              {f === 'none' ? 'No page yet' : f} ({counts[f]})
            </Button>
          ))}
        </div>
      )}

      {arranging ? null : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create projects under Projects first, then build their public pages here</p>
        </CardContent></Card>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No projects match this filter.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((row) => {
            const isPublicProject = PUBLIC_PROJECT_STATUSES.includes(row.project.status || '');
            return (
              <Card
                key={row.project._id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/website-project-pages/${row.project._id}`)}
              >
                {row.page?.coverImageUrl && (
                  <img src={row.page.coverImageUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      <span className="mr-1.5 text-muted-foreground font-medium" title="Position on the website">#{rank.get(row.project._id)}</span>
                      {row.project.name}
                    </CardTitle>
                    {pageBadge(row)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.page ? `/projects-hub/${row.page.slug}` : row.project.code}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.project.category && <Badge variant="outline" className="capitalize">{categoryLabel(row.project.category)}</Badge>}
                    <Badge variant={isPublicProject ? 'secondary' : 'destructive'}>
                      {PROJECT_STATUS_LABELS[row.project.status || ''] || row.project.status}
                    </Badge>
                    {row.page?.updatedAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Updated {new Date(row.page.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {!isPublicProject && (
                    <p className="text-xs text-destructive">Only approved, active or completed projects appear on the public site.</p>
                  )}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {row.page?.status === 'published' && isPublicProject && (
                      <Button variant="ghost" size="icon" title="View page" onClick={() => window.open(`/projects-hub/${row.page!.slug}`, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {canWrite && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/website-project-pages/${row.project._id}`)}>
                        {row.page ? <><Edit2 className="h-4 w-4 mr-1" />Edit page</> : <><Plus className="h-4 w-4 mr-1" />Build page</>}
                      </Button>
                    )}
                    {canDelete && row.page && (
                      <Button variant="ghost" size="icon" title="Delete page" onClick={() => setDeleting(row)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project page?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the public page for "{deleting?.project.name}" is removed — the project itself is untouched. This cannot be undone.
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
