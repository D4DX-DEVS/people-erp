import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, FolderKanban, Search, Plus } from 'lucide-react';
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
import { type ProjectPageRow, PROJECT_STATUS_LABELS, PUBLIC_PROJECT_STATUSES } from '@/types/projectPage';

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
      </div>

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

      {rows.length === 0 ? (
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
                    <CardTitle className="text-base">{row.project.name}</CardTitle>
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
