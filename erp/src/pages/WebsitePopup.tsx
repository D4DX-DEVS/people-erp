import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { ColorPicker } from "@/components/site/ColorPicker";
import { useToast } from "@/hooks/use-toast";
import { website } from "@/lib/api";
import { useRBAC } from "@/hooks/useRBAC";
import { Loader2, Save, Upload, X } from "lucide-react";

const EMPTY = { enabled: false, title: "", subtitle: "", description: "", content: "", imageUrl: "", backgroundColor: "", textColor: "", buttonText: "", buttonLink: "", buttonColor: "", buttonTextColor: "" };

export default function WebsitePopup() {
  const { toast } = useToast();
  const { hasAnyPermission } = useRBAC();
  const canEdit = hasAnyPermission(["website.write", "settings.write"]);
  const [popup, setPopup] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popupImageUploading, setPopupImageUploading] = useState(false);

  const apply = (p: any) => setPopup({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, k === "enabled" ? !!p?.[k] : p?.[k] || ""])) } as typeof EMPTY);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await website.getSettings();
        apply(res?.data?.settings?.popup);
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Failed to load popup settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const res: any = await website.updateSettings({ popup });
      // Show what the server actually stored, so a failed save can't look successful.
      apply(res?.data?.settings?.popup);
      toast({ title: "Success", description: "Popup settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePopupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 5 MB", variant: "destructive" });
      return;
    }
    try {
      setPopupImageUploading(true);
      const fd = new FormData();
      fd.append('image', file);
      const res = await website.uploadPopupImage(fd);
      if ((res as any).success) {
        setPopup((p) => ({ ...p, imageUrl: (res as any).data.imageUrl }));
        toast({ title: "Success", description: "Popup image uploaded" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setPopupImageUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome Popup</h1>
          <p className="text-sm text-muted-foreground">A popup shown once per visit when the home page opens. All fields are optional.</p>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Popup content</CardTitle>
          <CardDescription>Switch it on, fill in what you need, then click Save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={popup.enabled} onCheckedChange={(v) => setPopup({ ...popup, enabled: v })} disabled={!canEdit} id="popup-enabled" />
            <Label htmlFor="popup-enabled">{popup.enabled ? "Popup is ON" : "Popup is OFF"}</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label>
              <Input value={popup.title} onChange={(e) => setPopup({ ...popup, title: e.target.value })} disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Subtitle</Label>
              <Input value={popup.subtitle} onChange={(e) => setPopup({ ...popup, subtitle: e.target.value })} disabled={!canEdit} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label>
            <Textarea rows={2} value={popup.description} onChange={(e) => setPopup({ ...popup, description: e.target.value })} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Content</Label>
            <RichTextEditor minHeight={140} disabled={!canEdit} value={popup.content} onChange={(html) => setPopup({ ...popup, content: html })} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Background colour</Label>
              <ColorPicker value={popup.backgroundColor} defaultLabel="White" disabled={!canEdit} onChange={(v) => setPopup({ ...popup, backgroundColor: v })} /></div>
            <div className="space-y-2"><Label>Text colour</Label>
              <ColorPicker value={popup.textColor} defaultLabel="Default" disabled={!canEdit} onChange={(v) => setPopup({ ...popup, textColor: v })} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Button text</Label>
              <Input value={popup.buttonText} placeholder="e.g. Donate Now (leave empty for no button)" onChange={(e) => setPopup({ ...popup, buttonText: e.target.value })} disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Button link</Label>
              <Input value={popup.buttonLink} placeholder="https://… or /schemes" onChange={(e) => setPopup({ ...popup, buttonLink: e.target.value })} disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Button colour</Label>
              <ColorPicker value={popup.buttonColor} defaultLabel="Brand" disabled={!canEdit} onChange={(v) => setPopup({ ...popup, buttonColor: v })} /></div>
            <div className="space-y-2"><Label>Button text colour</Label>
              <ColorPicker value={popup.buttonTextColor} defaultLabel="White" disabled={!canEdit} onChange={(v) => setPopup({ ...popup, buttonTextColor: v })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            {popup.imageUrl && (
              <div className="relative w-full max-w-sm overflow-hidden rounded-xl border">
                <img src={popup.imageUrl} alt="Popup" className="max-h-48 w-full object-cover" />
                {canEdit && (
                  <button type="button" onClick={() => setPopup({ ...popup, imageUrl: "" })}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80" title="Remove image">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {canEdit && (
              <label className="flex w-fit cursor-pointer items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={popupImageUploading} asChild>
                  <span>
                    {popupImageUploading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                      : <><Upload className="mr-2 h-4 w-4" /> {popup.imageUrl ? "Change Image" : "Upload Image"}</>}
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handlePopupImageUpload} disabled={popupImageUploading} />
              </label>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · max 5MB. Remember to click Save to apply the changes.</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
