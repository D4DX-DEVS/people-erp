import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { sitePages } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import type { SitePage } from '@/types/sitePage';

export default function WebsitePages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const [items, setItems] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<SitePage | null>(null);

  const canWrite = hasAnyPermission(['website.write']);
  const canDelete = hasAnyPermission(['website.delete']);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res: any = await sitePages.getAll();
      if (res.success) setItems(res.data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to fetch pages', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleting?._id) return;
    try {
      const res: any = await sitePages.delete(deleting._id);
      if (res.success) {
        toast({ title: 'Success', description: 'Page deleted' });
        setIsDeleteOpen(false);
        setDeleting(null);
        fetchItems();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete page', variant: 'destructive' });
    }
  };

  const statusColor = (s: string) => s === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading pages...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Website Pages</h1>
          <p className="text-muted-foreground mt-1">Build and manage separate pages for your public website</p>
        </div>
        {canWrite && (
          <Button onClick={() => navigate('/website-pages/new')}>
            <Plus className="h-4 w-4 mr-2" />New Page
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <FileStack className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No pages yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a page to get started</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => (
            <Card
              key={it._id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => canWrite && it._id && navigate(`/website-pages/${it._id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{it.title}</CardTitle>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusColor(it.status)}`}>{it.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">/p/{it.slug}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {it.showInNav && <Badge variant="outline">In nav</Badge>}
                  {it.showOnHome && <Badge variant="outline">On home</Badge>}
                  {it.updatedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Updated {new Date(it.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {it.status === 'published' && (
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/p/${it.slug}`, '_blank')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {canWrite && (
                    <Button variant="ghost" size="icon" onClick={() => it._id && navigate(`/website-pages/${it._id}`)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => { setDeleting(it); setIsDeleteOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The page will no longer be accessible on the public site.</AlertDialogDescription>
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
