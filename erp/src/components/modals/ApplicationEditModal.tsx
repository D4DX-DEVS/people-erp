import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Save, Loader2, Upload, Trash2, Pencil, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProfilePhotoBox, photoSrc } from '../formbuilder/ProfilePhotoBox';
import { applications as applicationsApi } from '../../lib/api';
import { useToast } from '@/hooks/use-toast';

interface ApplicationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  formConfig: any;
  onSaved: () => void;
}

// Option entries are plain strings in most forms, { label, value } in newer ones
const optionParts = (option: any): { value: string; label: string } => {
  if (option && typeof option === 'object') {
    const value = option.value ?? option.label ?? '';
    return { value: String(value), label: String(option.label ?? value) };
  }
  return { value: String(option), label: String(option) };
};

const fileNameFromUrl = (url: string) =>
  decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');

// Table answers are a 2D array; older submissions stored a flat { "row_col": value } object
const toTable = (value: any, rows: number, cols: number): string[][] => {
  if (Array.isArray(value)) {
    return value.map((row) => Array.from({ length: cols }, (_, c) => (Array.isArray(row) ? row[c] ?? '' : '')));
  }
  if (value && typeof value === 'object') {
    let maxRow = rows - 1;
    for (const k of Object.keys(value)) {
      const r = Number(k.split('_')[0]);
      if (r > maxRow) maxRow = r;
    }
    return Array.from({ length: maxRow + 1 }, (_, r) =>
      Array.from({ length: cols }, (_, c) => value[`${r}_${c}`] ?? '')
    );
  }
  return Array.from({ length: rows }, () => Array(cols).fill(''));
};

// Every enabled field per page, whether it sits on the page or inside a section
const collectPages = (formConfig: any): { title: string; fields: any[] }[] =>
  (formConfig?.pages || []).map((page: any) => ({
    title: page.title,
    fields: [
      ...(page.fields || []),
      ...(page.sections || []).flatMap((s: any) => s.fields || [])
    ].filter((f: any) => f && f.enabled !== false)
  }));

/**
 * State-admin editor for a submitted application: every answer and uploaded
 * document from the scheme's form, saved back into formData.
 */
export const ApplicationEditModal: React.FC<ApplicationEditModalProps> = ({
  isOpen,
  onClose,
  application,
  formConfig,
  onSaved
}) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(application?.formData || {})));
    }
  }, [isOpen, application?._id]);

  const pages = useMemo(() => collectPages(formConfig), [formConfig]);

  if (!isOpen) return null;

  const setValue = (key: string, value: any) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleFileUpload = async (field: any, file: File) => {
    const key = `field_${field.id}`;
    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const uploaded = await applicationsApi.uploadFormFile(file, `forms/admin-edit/${field.id}`);
      setValue(key, uploaded.url);
      toast({ title: 'File uploaded', description: file.name });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload the file',
        variant: 'destructive'
      });
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSave = async () => {
    if (!application?._id) return;
    setSaving(true);
    try {
      await applicationsApi.update(application._id, { formData: draft });
      toast({ title: 'Application updated', description: 'The submitted data has been saved.' });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update the application',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: any) => {
    const key = `field_${field.id}`;
    const value = draft[key];
    const label = (
      <Label htmlFor={key} className="text-xs">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
    );
    const help = field.helpText ? <p className="text-[11px] text-muted-foreground">{field.helpText}</p> : null;

    switch (field.type) {
      case 'title':
        return <h4 key={key} className="text-sm font-semibold pt-2 md:col-span-2">{field.label}</h4>;

      case 'html':
      case 'group':
      case 'page':
        return null;

      case 'textarea':
        return (
          <div key={key} className="space-y-1 md:col-span-2">
            {label}
            <Textarea id={key} rows={3} value={value ?? ''} onChange={(e) => setValue(key, e.target.value)} />
            {help}
          </div>
        );

      case 'select':
      case 'dropdown':
      case 'yesno': {
        const options =
          field.type === 'yesno'
            ? [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]
            : (field.options || []).map(optionParts).filter((o: { value: string }) => o.value !== '');
        return (
          <div key={key} className="space-y-1">
            {label}
            <Select value={value ?? ''} onValueChange={(v) => setValue(key, v)}>
              <SelectTrigger id={key}>
                <SelectValue placeholder={field.placeholder || 'Select…'} />
              </SelectTrigger>
              <SelectContent>
                {options.map((o: { value: string; label: string }) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {help}
          </div>
        );
      }

      case 'radio':
        return (
          <div key={key} className="space-y-1">
            {label}
            <div className="space-y-1.5 pt-1">
              {(field.options || []).map(optionParts).filter((o: { value: string }) => o.value !== '').map((o: { value: string; label: string }) => (
                <div key={o.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`${key}_${o.value}`}
                    name={key}
                    value={o.value}
                    checked={value === o.value}
                    onChange={() => setValue(key, o.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`${key}_${o.value}`} className="text-xs font-normal">{o.label}</Label>
                </div>
              ))}
            </div>
            {help}
          </div>
        );

      case 'checkbox':
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-2 pt-5">
              <Checkbox id={key} checked={!!value} onCheckedChange={(checked) => setValue(key, !!checked)} />
              <Label htmlFor={key} className="text-xs font-normal">{field.label}</Label>
            </div>
            {help}
          </div>
        );

      case 'multiselect': {
        const selected: string[] = Array.isArray(value) ? value : [];
        return (
          <div key={key} className="space-y-1">
            {label}
            <div className="space-y-1.5 rounded-md border p-2">
              {(field.options || []).map(optionParts).filter((o: { value: string }) => o.value !== '').map((o: { value: string; label: string }) => (
                <div key={o.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${key}_${o.value}`}
                    checked={selected.includes(o.value)}
                    onCheckedChange={(checked) =>
                      setValue(key, checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))
                    }
                  />
                  <Label htmlFor={`${key}_${o.value}`} className="text-xs font-normal">{o.label}</Label>
                </div>
              ))}
            </div>
            {help}
          </div>
        );
      }

      case 'row':
      case 'column': {
        const cols = field.columns || 2;
        const metaKey = `${key}__rowMeta`;
        const rowMeta: { sourceRow: number; duplicateIndex: number }[] | null =
          Array.isArray(draft[metaKey]) && draft[metaKey].length > 0 ? draft[metaKey] : null;
        const table = toTable(value, rowMeta ? rowMeta.length : field.rows || 2, cols);
        const rowTitles: string[] = field.rowTitles || [];
        const hasRowLabels = rowTitles.some(Boolean);
        const rowLabel = (r: number) => {
          const meta = rowMeta?.[r];
          const base = rowTitles[meta ? meta.sourceRow : r] || `Row ${r + 1}`;
          return meta && meta.duplicateIndex > 0 ? `${base} (${meta.duplicateIndex})` : base;
        };
        const updateCell = (r: number, c: number, v: string) => {
          const next = table.map((row) => [...row]);
          next[r][c] = v;
          setValue(key, next);
        };
        return (
          <div key={key} className="space-y-1 md:col-span-2">
            {label}
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    {hasRowLabels && <th className="border-r border-b p-2 text-left font-medium">{field.firstColumnHeader || ''}</th>}
                    {Array.from({ length: cols }, (_, c) => (
                      <th key={c} className="border-r border-b p-2 text-left font-medium">
                        {field.columnTitles?.[c] || `Column ${c + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, r) => (
                    <tr key={r} className={r % 2 === 0 ? '' : 'bg-muted/30'}>
                      {hasRowLabels && (
                        <td className="border-r border-b p-2 text-muted-foreground bg-muted/50 whitespace-nowrap">{rowLabel(r)}</td>
                      )}
                      {Array.from({ length: cols }, (_, c) => (
                        <td key={c} className="border-r border-b p-1">
                          <Input
                            value={row[c] ?? ''}
                            onChange={(e) => updateCell(r, c, e.target.value)}
                            className="h-8 text-xs border-0 shadow-none focus-visible:ring-1"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {help}
          </div>
        );
      }

      case 'file':
      case 'profile_photo': {
        const isPhoto = field.type === 'profile_photo';
        const url = typeof value === 'string' && value.startsWith('http') ? value : undefined;
        const src = url || photoSrc(value);
        const isImage =
          isPhoto ||
          /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url || '') ||
          String(value?.mimeType || '').startsWith('image/');
        const currentName = url ? fileNameFromUrl(url) : value?.fileName || value?.originalName || 'View file';
        return (
          <div key={key} className="space-y-1">
            {label}
            <div className="flex items-start gap-3 rounded-md border p-2">
              {isPhoto ? (
                <ProfilePhotoBox src={src} className="h-20 w-16" />
              ) : src && isImage ? (
                <img src={src} alt={currentName} className="h-16 w-16 rounded border object-cover" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                {src ? (
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={url ? undefined : currentName}
                    className="block truncate text-xs text-blue-600 hover:underline"
                  >
                    {currentName}
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No file uploaded</p>
                )}
                <input
                  type="file"
                  ref={(el) => { fileInputs.current[key] = el; }}
                  className="hidden"
                  accept={isPhoto ? 'image/png,image/jpeg' : '.pdf,.jpg,.jpeg,.png,.doc,.docx,.gif,.webp'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(field, file);
                    e.target.value = '';
                  }}
                />
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!!uploading[key]}
                    onClick={() => fileInputs.current[key]?.click()}
                  >
                    {uploading[key] ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                    {src ? 'Replace' : 'Upload'}
                  </Button>
                  {src && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => setValue(key, '')}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {help}
          </div>
        );
      }

      default: {
        const inputType =
          field.type === 'phone' ? 'tel'
          : field.type === 'datetime' ? 'datetime-local'
          : ['email', 'number', 'url', 'date', 'time'].includes(field.type) ? field.type
          : 'text';
        return (
          <div key={key} className="space-y-1">
            {label}
            <Input
              id={key}
              type={inputType}
              value={value ?? ''}
              onChange={(e) => setValue(key, e.target.value)}
              placeholder={field.placeholder}
            />
            {help}
          </div>
        );
      }
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Edit Application</h2>
              <p className="text-xs text-muted-foreground">
                {application?.applicationNumber} · changes overwrite the beneficiary's submitted answers and documents
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {pages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">The scheme's form configuration is not available, so this application cannot be edited here.</p>
            </div>
          ) : (
            pages.map((page, i) => (
              <section key={i} className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-1">{page.title || `Page ${i + 1}`}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{page.fields.map(renderField)}</div>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t">
          <p className="text-xs text-muted-foreground">The eligibility score is recalculated after saving.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || pages.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
