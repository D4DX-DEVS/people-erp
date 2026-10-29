import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ImagePlus, Loader2, RefreshCw, Trash2, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { gallery, sitePages } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChecklistPicker, type ChecklistOption } from '@/components/site/ChecklistPicker';
import { type SectionImage, IMAGE_SPECS, IMAGE_FORMAT_NOTE } from '@/types/sitePage';

const MAX_BYTES = 5 * 1024 * 1024;
const isImageFile = (f: File) => f.type.startsWith('image/');

async function uploadOne(file: File): Promise<SectionImage> {
  const fd = new FormData();
  fd.append('image', file);
  const res: any = await sitePages.uploadImage(fd);
  if (!res?.success) throw new Error(res?.message || 'Upload failed');
  return { imageUrl: res.data.fileUrl, imageKey: res.data.key, caption: '' };
}

// Albums are shared by every gallery section on the page, so fetch them once.
let albumOptionsCache: Promise<ChecklistOption[]> | null = null;
function loadAlbumOptions(): Promise<ChecklistOption[]> {
  if (!albumOptionsCache) {
    albumOptionsCache = gallery.getAll()
      .then((res: any) => (res?.data || []).map((a: any) => ({
        value: a._id,
        label: a.title,
        imageUrl: a.coverImageUrl || a.images?.[0]?.imageUrl,
        hint: `${(a.images || []).length} photo${(a.images || []).length === 1 ? '' : 's'}${a.status === 'inactive' ? ' · inactive — hidden on the website' : ''}`,
      })))
      .catch((e) => { albumOptionsCache = null; throw e; });
  }
  return albumOptionsCache;
}

/**
 * Image Gallery section editor: upload many images at once (picker or
 * drag-and-drop), then caption, reorder, replace or remove them — one at a
 * time or as a selection — and optionally pull in whole Gallery albums.
 */
export function GalleryImagesEditor({
  images, albums, onChange, disabled,
}: {
  images: SectionImage[];
  albums: string[];
  onChange: (patch: { images?: SectionImage[]; galleryAlbums?: string[] }) => void;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [albumOptions, setAlbumOptions] = useState<ChecklistOption[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);

  // Uploads finish after later renders; always merge into the latest list and
  // call the latest onChange so edits made meanwhile are not reverted.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let alive = true;
    loadAlbumOptions()
      .then((opts) => alive && setAlbumOptions(opts))
      .catch(() => {})
      .finally(() => alive && setAlbumsLoading(false));
    return () => { alive = false; };
  }, []);

  // Selection is by position; drop it whenever the list changes length.
  useEffect(() => { setSelected(new Set()); }, [images.length]);

  const busy = !!progress || replacing !== null;

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const ok = files.filter((f) => isImageFile(f) && f.size <= MAX_BYTES);
    const skipped = files.length - ok.length;
    if (skipped) {
      toast({ title: `${skipped} file${skipped > 1 ? 's' : ''} skipped`, description: `Only images up to 5MB can be added.`, variant: 'destructive' });
    }
    if (!ok.length) return;
    setProgress({ done: 0, total: ok.length });
    let failed = 0;
    for (let i = 0; i < ok.length; i++) {
      try {
        const img = await uploadOne(ok[i]);
        onChangeRef.current({ images: [...(imagesRef.current || []), img] });
        // Let React commit so imagesRef sees this image before the next append.
        await new Promise((r) => setTimeout(r, 0));
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: ok.length });
    }
    setProgress(null);
    if (failed) toast({ title: 'Some uploads failed', description: `${failed} of ${ok.length} images could not be uploaded.`, variant: 'destructive' });
  };

  const replaceAt = async (file: File, index: number) => {
    if (!isImageFile(file) || file.size > MAX_BYTES) {
      toast({ title: 'Invalid image', description: IMAGE_FORMAT_NOTE, variant: 'destructive' });
      return;
    }
    setReplacing(index);
    try {
      const img = await uploadOne(file);
      const next = (imagesRef.current || []).slice();
      if (next[index]) next[index] = { ...img, caption: next[index].caption || '' };
      onChangeRef.current({ images: next });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setReplacing(null);
    }
  };

  const setCaption = (index: number, caption: string) => {
    const next = images.slice();
    next[index] = { ...next[index], caption };
    onChange({ images: next });
  };
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ images: next });
  };
  const removeIndexes = (indexes: Set<number>) => {
    onChange({ images: images.filter((_, i) => !indexes.has(i)) });
    setSelected(new Set());
  };
  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const allSelected = images.length > 0 && selected.size === images.length;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs">Uploaded images ({images.length})</Label>
          {images.length > 0 && !disabled && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(images.map((_, i) => i)) : new Set())} />
                Select all
              </label>
              {selected.size > 0 && (
                <>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                    Clear selection
                  </Button>
                  <Button type="button" variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeIndexes(selected)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />Remove {selected.size}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border',
            disabled && 'opacity-60',
          )}
        >
          {progress ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…</p>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag &amp; drop images here, or</p>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-1.5 h-4 w-4" />Select images
              </Button>
              <p className="text-xs text-muted-foreground">You can select several at once. {IMAGE_SPECS.gallery} {IMAGE_FORMAT_NOTE}.</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { const f = e.target.files; if (f?.length) addFiles(f); e.target.value = ''; }}
          />
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f && replaceIndex.current !== null) replaceAt(f, replaceIndex.current);
            }}
          />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={`${img.imageKey || img.imageUrl}-${i}`}
                className={cn('space-y-1.5 rounded-lg border p-1.5', selected.has(i) ? 'border-primary ring-1 ring-primary' : 'border-border/60')}
              >
                <div className="group relative">
                  <img src={img.imageUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
                  {replacing === i && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  {!disabled && (
                    <>
                      <div className="absolute left-1.5 top-1.5 rounded bg-background/90 p-0.5">
                        <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleSelect(i)} aria-label={`Select image ${i + 1}`} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIndexes(new Set([i]))}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="secondary" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move left">
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                          <Button type="button" size="icon" variant="secondary" className="h-6 w-6" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Move right">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          type="button" size="icon" variant="secondary" className="h-6 w-6" disabled={busy} aria-label="Replace image"
                          onClick={() => { replaceIndex.current = i; replaceRef.current?.click(); }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <Input
                  placeholder="Caption"
                  className="h-7 text-xs"
                  disabled={disabled}
                  value={img.caption || ''}
                  onChange={(e) => setCaption(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <Label className="text-xs">Photos from Gallery albums</Label>
        <p className="text-xs text-muted-foreground">
          Selected albums appear as cover tiles after the images above, just like on the Gallery page —
          visitors click a cover to open the album. Manage the photos under Website Management → Gallery.
        </p>
        <ChecklistPicker
          options={albumOptions}
          value={albums}
          loading={albumsLoading}
          disabled={disabled}
          searchPlaceholder="Search albums…"
          emptyText="No gallery albums yet — create them under Gallery."
          onChange={(galleryAlbums) => onChange({ galleryAlbums })}
        />
      </div>
    </div>
  );
}
