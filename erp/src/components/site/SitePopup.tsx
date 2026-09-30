import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RichContent } from "@/components/site/RichContent";
import { stripHtml } from "@/lib/richText";
import { Button } from "@/components/ui/button";
import { colorValue } from "@/lib/siteColors";
import { useNavigate } from "react-router-dom";

export interface PopupSettings {
  enabled?: boolean; title?: string; subtitle?: string; description?: string; content?: string; imageUrl?: string;
  backgroundColor?: string; textColor?: string; buttonText?: string; buttonLink?: string; buttonColor?: string; buttonTextColor?: string;
}

/** Welcome popup opened once per browser session when the home page loads. */
export function SitePopup({ popup }: { popup?: PopupSettings }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hasBody = !!(popup?.title || popup?.subtitle || popup?.description || stripHtml(popup?.content) || popup?.imageUrl);
  // Re-shows when the admin edits the popup, because the fingerprint changes.
  const fingerprint = JSON.stringify([popup?.backgroundColor, popup?.textColor, popup?.buttonText, popup?.buttonLink, popup?.buttonColor, popup?.buttonTextColor, popup?.title, popup?.subtitle, popup?.description, popup?.content, popup?.imageUrl]);

  useEffect(() => {
    if (!popup?.enabled || !hasBody) return;
    try {
      if (sessionStorage.getItem("site-popup") === fingerprint) return;
    } catch { /* storage blocked — just show it */ }
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [popup?.enabled, hasBody, fingerprint]);

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) { try { sessionStorage.setItem("site-popup", fingerprint); } catch { /* ignore */ } }
  };

  if (!popup?.enabled || !hasBody) return null;
  const bg = popup.backgroundColor ? colorValue(popup.backgroundColor) : "#ffffff";
  const fg = popup.textColor ? colorValue(popup.textColor) : undefined;
  const goButton = () => {
    const link = popup.buttonLink?.trim();
    setOpen(false);
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener");
    else navigate(link);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] min-w-0 max-w-none overflow-y-auto p-0 md:w-[45vw]" style={{ backgroundColor: bg, color: fg }}>
        {popup.imageUrl && <img src={popup.imageUrl} alt={popup.title || ""} className="w-full rounded-t-lg object-cover" />}
        <div className="space-y-2 p-6 text-center" style={{ color: fg }}>
          {popup.title ? <DialogTitle className="text-2xl font-bold">{popup.title}</DialogTitle> : <DialogTitle className="sr-only">Announcement</DialogTitle>}
          {popup.subtitle && <p className={fg ? "text-base font-medium" : "text-base font-medium text-primary"}>{popup.subtitle}</p>}
          {popup.description ? <DialogDescription className="text-sm" style={{ color: fg, opacity: fg ? 0.85 : undefined }}>{popup.description}</DialogDescription> : <DialogDescription className="sr-only">Site announcement</DialogDescription>}
          {popup.content && <RichContent content={popup.content} className="pt-2 text-left text-sm" style={{ color: fg }} />}
          {popup.buttonText && (
            <div className="pt-3">
              <Button className="rounded-full px-8" onClick={goButton}
                style={{ backgroundColor: popup.buttonColor ? colorValue(popup.buttonColor) : undefined, color: popup.buttonTextColor ? colorValue(popup.buttonTextColor) : undefined }}>
                {popup.buttonText}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
