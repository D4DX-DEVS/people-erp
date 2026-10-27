import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Quote, Home, FolderKanban, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { testimonials as testimonialsApi } from '@/lib/api';
import { useRBAC } from '@/hooks/useRBAC';
import { ProjectLinksField } from '@/components/site/ProjectLinksField';

interface TestimonialItem {
  _id: string;
  name: string;
  designation?: string;
  location?: string;
  comment: string;
  photoUrl?: string;
  showOnHome: boolean;
  showOnProjectPages: boolean;
  projects?: Array<{ _id: string; name: string }>;
  order: number;
  status: 'active' | 'inactive';
}

const EMPTY_FORM = {
  name: '', designation: '', location: '', comment: '',
  showOnHome: true, order: 0, status: 'active' as 'active' | 'inactive',
};
const COMMENT_MAX = 2000;

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export default function WebsiteTestimonials() {
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [deleting, setDeleting] = useState<TestimonialItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [projectLinks, setProjectLinks] = useState<{ enabled: boolean; projects: string[] }>({ enabled: false, projects: [] });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [removePhoto, setRemovePhoto] = useState(false);

  const canWrite = hasAnyPermission(['website.write']);
  const canDelete = hasAnyPermission(['website.delete']);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res: any = await testimonialsApi.getAll();
      if (res.success) setItems(res.data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to fetch testimonials', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openModal = (item?: TestimonialItem) => {
    setEditing(item || null);
    setForm(item ? {
      name: item.name, designation: item.designation || '', location: item.location || '', comment: item.comment,
      showOnHome: item.showOnHome !== false, order: item.order || 0, status: item.status,
    } : { ...EMPTY_FORM, order: items.length });
    setProjectLinks({ enabled: !!item?.showOnProjectPages, projects: (item?.projects || []).map((p) => p._id) });
    setPhotoFile(null);
    setPhotoPreview(item?.photoUrl || '');
    setRemovePhoto(false);
    setIsModalOpen(true);
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.type)) {
      toast({ title: 'Invalid file', description: 'Choose a JPG, PNG, WebP or GIF image', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setRemovePhoto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) {
      toast({ title: 'Missing details', description: 'Name and comment are required', variant: 'destructive' });
      return;
    }
    if (projectLinks.enabled && !projectLinks.projects.length) {
      toast({ title: 'Pick a project', description: "Select at least one project page, or turn off 'List on project pages'", variant: 'destructive' });
      return;
    }
    if (!form.showOnHome && !projectLinks.enabled) {
      toast({ title: 'Heads up', description: 'This testimonial is not set to show anywhere on the website yet.' });
    }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('designation', form.designation.trim());
      fd.append('location', form.location.trim());
      fd.append('comment', form.comment.trim());
      fd.append('showOnHome', String(form.showOnHome));
      fd.append('order', String(form.order || 0));
      fd.append('status', form.status);
      fd.append('showOnProjectPages', String(projectLinks.enabled));
      fd.append('projects', JSON.stringify(projectLinks.enabled ? projectLinks.projects : []));
      if (photoFile) fd.append('photo', photoFile);
      if (editing && removePhoto && !photoFile) fd.append('removePhoto', 'true');
      const res: any = editing ? await testimonialsApi.update(editing._id, fd) : await testimonialsApi.create(fd);
      if (res.success) {
        toast({ title: 'Success', description: editing ? 'Testimonial updated' : 'Testimonial added' });
        setIsModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save testimonial', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res: any = await testimonialsApi.delete(deleting._id);
      if (res.success) {
        toast({ title: 'Success', description: 'Testimonial deleted' });
        setDeleting(null);
        fetchItems();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete testimonial', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading testimonials...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">Testimonials</h1>
          <p className="text-muted-foreground mt-1">
            Words from beneficiaries, volunteers and partners — shown on the home page and on selected project pages
          </p>
        </div>
        {canWrite && <Button onClick={() => openModal()}><Plus className="h-4 w-4 mr-2" />Add Testimonial</Button>}
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Quote className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No testimonials yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add one to show it in the Testimonials band on the home page</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it._id} className={it.status === 'inactive' ? 'opacity-60' : ''}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  {it.photoUrl ? (
                    <img src={it.photoUrl} alt={it.name} className="h-12 w-12 shrink-0 rounded-full object-cover border border-border/60" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {initials(it.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{it.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[it.designation, it.location].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <Badge variant={it.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{it.status}</Badge>
                </div>
                <p className="line-clamp-4 flex-1 text-sm text-muted-foreground">“{it.comment}”</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {it.showOnHome && <Badge variant="outline" className="gap-1 font-normal"><Home className="h-3 w-3" />Home page</Badge>}
                  {it.showOnProjectPages && (it.projects || []).map((p) => (
                    <Badge key={p._id} variant="outline" className="gap-1 font-normal"><FolderKanban className="h-3 w-3" />{p.name}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-xs text-muted-foreground">Order {it.order}</span>
                  <div className="flex gap-1">
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => openModal(it)}><Edit2 className="h-4 w-4" /></Button>}
                    {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleting(it)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 space-y-1 text-center">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="h-20 w-20 rounded-full object-cover border border-border/60" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                      {initials(form.name) || '?'}
                    </div>
                  )}
                  {photoPreview && (
                    <button type="button" onClick={clearPhoto} className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label="Remove photo">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <label className="inline-block cursor-pointer text-xs font-medium text-primary hover:underline">
                  {photoPreview ? 'Change' : 'Add photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPhoto} />
                </label>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Designation / role</Label><Input value={form.designation} maxLength={120} placeholder="e.g. Beneficiary, Volunteer" onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                <div><Label>Place / organisation</Label><Input value={form.location} maxLength={120} placeholder="e.g. Kozhikode" onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Profile photo is optional — 400 × 400 px square, face centred. Initials are shown when there is no photo.</p>

            <div>
              <Label>Comment *</Label>
              <Textarea rows={5} value={form.comment} maxLength={COMMENT_MAX} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="What they said about the foundation or the project…" />
              <p className="mt-1 text-right text-xs text-muted-foreground">{form.comment.length}/{COMMENT_MAX}</p>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div>
                <Label className="text-sm">Show on home page</Label>
                <p className="text-xs text-muted-foreground">Listed in the Testimonials band (Website Settings → Home Page Layout controls where it sits).</p>
              </div>
              <Switch checked={form.showOnHome} onCheckedChange={(v) => setForm({ ...form, showOnHome: v })} />
            </div>

            <ProjectLinksField itemLabel="testimonial" enabled={projectLinks.enabled} projects={projectLinks.projects} onChange={setProjectLinks} />

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Order</Label><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>It is removed from the home page and every project page. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
