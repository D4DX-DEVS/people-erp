import React, { useState } from 'react';
import {
  ArrowUp, ArrowDown, ChevronDown, ChevronUp, Trash2, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { sitePages } from '@/lib/api';
import { IconPicker } from '@/components/site/IconPicker';
import { ColorPicker } from '@/components/site/ColorPicker';
import {
  type PageSection, type SectionItem, type SectionType, type SectionBackground, type SitePageHero,
  SECTION_TYPE_LABELS, CONTENT_SOURCE_LABELS, BACKGROUND_LABELS, emptySection, IMAGE_SPECS, IMAGE_FORMAT_NOTE,
} from '@/types/sitePage';

/**
 * Shared page-builder editors: hero banner, image upload and the section
 * list. Used by the Website Pages builder and the Project Pages builder so
 * both offer exactly the same section types, icons, colours and backgrounds.
 */

// ── image upload field (reusable) ───────────────────────────────────────

export function ImageUploadField({
  imageUrl, onUploaded, onRemove, disabled, compact, hint,
}: {
  imageUrl?: string;
  onUploaded: (url: string, key: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  compact?: boolean;
  hint?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', file);
      const res: any = await sitePages.uploadImage(fd);
      if (res.success) onUploaded(res.data.fileUrl, res.data.key);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const hintText = hint && <p className="text-xs text-muted-foreground">{hint}</p>;

  if (imageUrl) {
    return (
      <div className="space-y-1">
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt=""
            className={compact ? 'h-16 w-16 rounded-md object-cover border border-border/60' : 'h-32 rounded-lg object-cover border border-border/60'}
          />
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {hintText}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input type="file" accept="image/*" disabled={disabled || uploading} onChange={handleFile} />
      {uploading ? <p className="text-xs text-muted-foreground">Uploading...</p> : hintText}
    </div>
  );
}

// ── generic items editor (cards / stats / timeline / team / faq) ─────────

interface ItemFieldDef {
  key: 'title' | 'subtitle' | 'description' | 'value' | 'icon' | 'color' | 'link' | 'image';
  label: string;
  type?: 'text' | 'textarea';
}

const ITEM_FIELDS: Partial<Record<SectionType, ItemFieldDef[]>> = {
  cards: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image', label: 'Image' },
    { key: 'icon', label: 'Icon (shown when there is no image)' },
    { key: 'color', label: 'Icon colour' },
    { key: 'link', label: 'Link URL', type: 'text' },
  ],
  stats: [
    { key: 'value', label: 'Value (e.g. 900+)', type: 'text' },
    { key: 'title', label: 'Label', type: 'text' },
    { key: 'icon', label: 'Icon' },
    { key: 'color', label: 'Icon colour' },
  ],
  timeline: [
    { key: 'value', label: 'Year / Date', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  team: [
    { key: 'title', label: 'Name', type: 'text' },
    { key: 'subtitle', label: 'Role', type: 'text' },
    { key: 'description', label: 'Short bio', type: 'textarea' },
    { key: 'image', label: 'Photo' },
  ],
  faq: [
    { key: 'title', label: 'Question', type: 'text' },
    { key: 'description', label: 'Answer', type: 'textarea' },
  ],
};

function ItemsEditor({
  items, onChange, fields, disabled, imageHint, accentColor,
}: {
  items: SectionItem[];
  onChange: (items: SectionItem[]) => void;
  fields: ItemFieldDef[];
  disabled?: boolean;
  imageHint?: string;
  /** Section accent — the colour an item's icon inherits when it has none of its own. */
  accentColor?: string;
}) {
  const update = (i: number, patch: Partial<SectionItem>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...items, {}]);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || i === items.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              f.key === 'image' ? (
                <div key={f.key} className="sm:col-span-2">
                  <Label className="text-xs">{f.label}</Label>
                  <ImageUploadField
                    imageUrl={item.imageUrl}
                    disabled={disabled}
                    compact
                    hint={imageHint}
                    onUploaded={(url, key) => update(i, { imageUrl: url, imageKey: key })}
                    onRemove={() => update(i, { imageUrl: '', imageKey: '' })}
                  />
                </div>
              ) : f.key === 'icon' ? (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <IconPicker value={item.icon} color={item.color || accentColor} disabled={disabled} onChange={(v) => update(i, { icon: v })} />
                </div>
              ) : f.key === 'color' ? (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <ColorPicker value={item.color} defaultLabel="Section colour" disabled={disabled} onChange={(v) => update(i, { color: v })} />
                </div>
              ) : f.type === 'textarea' ? (
                <div key={f.key} className="sm:col-span-2">
                  <Label className="text-xs">{f.label}</Label>
                  <Textarea rows={2} disabled={disabled} value={(item as any)[f.key] || ''} onChange={(e) => update(i, { [f.key]: e.target.value } as any)} />
                </div>
              ) : (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input disabled={disabled} value={(item as any)[f.key] || ''} onChange={(e) => update(i, { [f.key]: e.target.value } as any)} />
                </div>
              )
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" />Add Item
      </Button>
    </div>
  );
}

// ── single section card ───────────────────────────────────────────────────

function SectionCard({
  section, index, total, disabled, onUpdate, onRemove, onMove,
}: {
  section: PageSection;
  index: number;
  total: number;
  disabled?: boolean;
  onUpdate: (patch: Partial<PageSection>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  // Stored on the section itself (UI-only, stripped on save) so the state
  // travels with the section through reorder/delete instead of array position.
  const expanded = section._expanded !== false;
  const showFooterBackground = section.type !== 'cta';

  const addGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const fd = new FormData();
    fd.append('image', file);
    const res: any = await sitePages.uploadImage(fd);
    if (res.success) {
      const images = section.images || [];
      onUpdate({ images: [...images, { imageUrl: res.data.fileUrl, imageKey: res.data.key, caption: '' }] });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="flex items-center gap-2 text-left" onClick={() => onUpdate({ _expanded: !expanded })}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <CardTitle className="text-sm">{SECTION_TYPE_LABELS[section.type]}</CardTitle>
            {section.title && <span className="text-xs text-muted-foreground">— {section.title}</span>}
          </button>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input disabled={disabled} value={section.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Subtitle</Label>
              <Input disabled={disabled} value={section.subtitle || ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Section icon</Label>
              <IconPicker value={section.icon} color={section.accentColor} disabled={disabled} onChange={(v) => onUpdate({ icon: v })} />
              <p className="text-xs text-muted-foreground mt-1">Shown above the section title.</p>
            </div>
            <div>
              <Label className="text-xs">Accent colour</Label>
              <ColorPicker value={section.accentColor} defaultLabel="Brand colour" disabled={disabled} onChange={(v) => onUpdate({ accentColor: v })} />
              <p className="text-xs text-muted-foreground mt-1">Used for the section icon, item icons and highlights unless an item picks its own colour.</p>
            </div>
          </div>

          {section.type === 'richtext' && (
            <div>
              <Label className="text-xs">Content</Label>
              <Textarea rows={8} disabled={disabled} value={section.content || ''} onChange={(e) => onUpdate({ content: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Plain text; blank line = new paragraph</p>
            </div>
          )}

          {section.type === 'image-text' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Content</Label>
                <Textarea rows={6} disabled={disabled} value={section.content || ''} onChange={(e) => onUpdate({ content: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Image</Label>
                <ImageUploadField
                  imageUrl={section.imageUrl}
                  disabled={disabled}
                  hint={IMAGE_SPECS.imageText}
                  onUploaded={(url, key) => onUpdate({ imageUrl: url, imageKey: key })}
                  onRemove={() => onUpdate({ imageUrl: '', imageKey: '' })}
                />
              </div>
              <div>
                <Label className="text-xs">Image Position</Label>
                <Select disabled={disabled} value={section.imagePosition || 'right'} onValueChange={(v) => onUpdate({ imagePosition: v as 'left' | 'right' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {section.type === 'cards' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Columns</Label>
                <Select disabled={disabled} value={String(section.columns || 3)} onValueChange={(v) => onUpdate({ columns: Number(v) })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Cards show the first 3 lines of the description. If a description is longer, the card becomes clickable
                and opens the full text in a popup — so write as much detail as you need.
              </p>
              <ItemsEditor items={section.items || []} fields={ITEM_FIELDS.cards!} disabled={disabled} imageHint={IMAGE_SPECS.cards} accentColor={section.accentColor} onChange={(items) => onUpdate({ items })} />
            </div>
          )}

          {section.type === 'stats' && (
            <ItemsEditor items={section.items || []} fields={ITEM_FIELDS.stats!} disabled={disabled} accentColor={section.accentColor} onChange={(items) => onUpdate({ items })} />
          )}

          {section.type === 'timeline' && (
            <ItemsEditor items={section.items || []} fields={ITEM_FIELDS.timeline!} disabled={disabled} onChange={(items) => onUpdate({ items })} />
          )}

          {section.type === 'team' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Columns</Label>
                <Select disabled={disabled} value={String(section.columns || 3)} onValueChange={(v) => onUpdate({ columns: Number(v) })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Long bios are trimmed to 3 lines on the tile and open in full when the member is clicked.
              </p>
              <ItemsEditor items={section.items || []} fields={ITEM_FIELDS.team!} disabled={disabled} imageHint={IMAGE_SPECS.team} onChange={(items) => onUpdate({ items })} />
            </div>
          )}

          {section.type === 'faq' && (
            <ItemsEditor items={section.items || []} fields={ITEM_FIELDS.faq!} disabled={disabled} onChange={(items) => onUpdate({ items })} />
          )}

          {section.type === 'cta' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Content</Label>
                <Textarea rows={3} disabled={disabled} value={section.content || ''} onChange={(e) => onUpdate({ content: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Button Text</Label>
                  <Input disabled={disabled} value={section.ctaText || ''} onChange={(e) => onUpdate({ ctaText: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Button Link</Label>
                  <Input disabled={disabled} value={section.ctaLink || ''} onChange={(e) => onUpdate({ ctaLink: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Background</Label>
                <Select disabled={disabled} value={section.background || 'default'} onValueChange={(v) => onUpdate({ background: v as PageSection['background'] })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="muted">Muted</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {section.type === 'video' && (
            <div>
              <Label className="text-xs">Video URL</Label>
              <Input disabled={disabled} placeholder="https://youtube.com/... or .mp4 URL" value={section.videoUrl || ''} onChange={(e) => onUpdate({ videoUrl: e.target.value })} />
            </div>
          )}

          {section.type === 'gallery' && (
            <div className="space-y-3">
              <Label className="text-xs">Add Image</Label>
              <Input type="file" accept="image/*" disabled={disabled} onChange={addGalleryImage} />
              <p className="text-xs text-muted-foreground">{IMAGE_SPECS.gallery}</p>
              {(section.images || []).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(section.images || []).map((img, i) => (
                    <div key={i} className="space-y-1">
                      <div className="relative">
                        <img src={img.imageUrl} alt="" className="h-24 w-full rounded-md object-cover border border-border/60" />
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => onUpdate({ images: (section.images || []).filter((_, idx) => idx !== i) })}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="Caption"
                        disabled={disabled}
                        value={img.caption || ''}
                        onChange={(e) => {
                          const next = (section.images || []).slice();
                          next[i] = { ...next[i], caption: e.target.value };
                          onUpdate({ images: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.type === 'content' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Content Source</Label>
                <Select disabled={disabled} value={section.contentSource || 'news'} onValueChange={(v) => onUpdate({ contentSource: v as PageSection['contentSource'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_SOURCE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Item Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  disabled={disabled}
                  value={section.contentLimit ?? 6}
                  onChange={(e) => onUpdate({ contentLimit: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Latest published items are pulled automatically on the live page. Their images come from the source
                module (News &amp; Events, Blogs, Gallery…) — upload them there at the size that module recommends.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">View More Link Text</Label>
                  <Input disabled={disabled} value={section.ctaText || ''} onChange={(e) => onUpdate({ ctaText: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">View More Link URL</Label>
                  <Input disabled={disabled} value={section.ctaLink || ''} onChange={(e) => onUpdate({ ctaLink: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {showFooterBackground && (
            <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Section Background</Label>
                <Select disabled={disabled} value={section.background || 'default'} onValueChange={(v) => onUpdate({ background: v as SectionBackground })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BACKGROUND_LABELS) as SectionBackground[]).map((val) => (
                      <SelectItem key={val} value={val}>{BACKGROUND_LABELS[val]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {section.background === 'tint'
                    ? 'A soft wash of the accent colour behind the section.'
                    : section.background === 'custom'
                      ? 'Any colour you like — text turns white automatically on dark colours.'
                      : section.background === 'primary'
                        ? 'The brand gradient card with white text.'
                        : section.background === 'muted'
                          ? 'A light grey band.'
                          : 'Plain page background.'}
                </p>
              </div>
              {section.background === 'custom' && (
                <div>
                  <Label className="text-xs">Background colour</Label>
                  <ColorPicker value={section.backgroundColor} allowDefault={false} disabled={disabled} onChange={(v) => onUpdate({ backgroundColor: v })} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── section list (add / reorder / remove) ────────────────────────────────

/** Strip UI-only fields and make persisted `order` match array position — the public page sorts by `order`. */
export function stripSections(sections: PageSection[]): PageSection[] {
  return sections.map(({ _expanded, ...s }, i) => ({ ...s, order: i }));
}

export function SectionsEditor({
  sections, onChange, disabled,
}: {
  sections: PageSection[];
  onChange: (sections: PageSection[]) => void;
  disabled?: boolean;
}) {
  // Keep each section's persisted `order` in sync with its array position —
  // the public page sorts by `order`, not array order.
  const renumber = (list: PageSection[]) => list.map((s, i) => ({ ...s, order: i }));

  const updateSection = (index: number, patch: Partial<PageSection>) => {
    const next = sections.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeSection = (index: number) => onChange(renumber(sections.filter((_, i) => i !== index)));
  const moveSection = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[index], next[j]] = [next[j], next[index]];
    onChange(renumber(next));
  };
  const addSection = (type: SectionType) => onChange([...sections, emptySection(type, sections.length)]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Sections</h2>
        {!disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Section
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => addSection(type)}>
                  {SECTION_TYPE_LABELS[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {sections.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No sections yet. Use "Add Section" to build the page.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <SectionCard
              key={i}
              section={section}
              index={i}
              total={sections.length}
              disabled={disabled}
              onUpdate={(patch) => updateSection(i, patch)}
              onRemove={() => removeSection(i)}
              onMove={(dir) => moveSection(i, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── hero banner card ─────────────────────────────────────────────────────

export function HeroEditor({
  hero, onChange, disabled, titlePlaceholder,
}: {
  hero?: SitePageHero;
  onChange: (hero: SitePageHero) => void;
  disabled?: boolean;
  titlePlaceholder?: string;
}) {
  const h = hero || {};
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Hero Banner</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Hero Title</Label>
            <Input disabled={disabled} placeholder={titlePlaceholder} value={h.title || ''} onChange={(e) => onChange({ ...h, title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Hero Subtitle</Label>
            <Input disabled={disabled} value={h.subtitle || ''} onChange={(e) => onChange({ ...h, subtitle: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Hero Image</Label>
          <ImageUploadField
            imageUrl={h.imageUrl}
            disabled={disabled}
            hint={`${IMAGE_SPECS.hero} · ${IMAGE_FORMAT_NOTE}`}
            onUploaded={(url, key) => onChange({ ...h, imageUrl: url, imageKey: key })}
            onRemove={() => onChange({ ...h, imageUrl: '', imageKey: '' })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
