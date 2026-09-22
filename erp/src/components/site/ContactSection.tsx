import { useState } from "react";
import { Mail, MapPin, Phone, MessageCircle, Send, Loader2, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { contactMessages } from "@/lib/api";
import { useSiteData } from "@/hooks/useSiteData";
import { resolveIcon } from "@/lib/siteIcons";
import { iconBadgeStyle } from "@/lib/siteColors";
import { mapEmbedSrc } from "@/lib/mapEmbed";
import type { PageSection } from "@/types/sitePage";

/**
 * "Contact Block" section: details card on the left, message form on the
 * right, location map underneath.
 *
 * The details come from Website Settings → Contact Details, the same record
 * the footer reads, so the address and phone number are never entered twice.
 * The section's own items sit below them for anything settings has no field
 * for — office hours, a second branch, a helpline.
 */

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "" };

/** Strip spaces and punctuation so a number typed for humans still dials. */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const waHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

type BadgeStyle = { color: string; backgroundColor: string };

function DetailRow({
  icon: Icon, label, value, href, badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  badge: BadgeStyle;
}) {
  const text = href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="hover:text-primary">
      {value}
    </a>
  ) : (
    value
  );
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={badge}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="whitespace-pre-line text-sm font-medium leading-relaxed">{text}</div>
      </div>
    </li>
  );
}

const SOCIALS = [
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "twitter", label: "X (Twitter)", icon: Twitter },
] as const;

export function ContactSection({ section, badge }: { section: PageSection; badge: BadgeStyle }) {
  const { toast } = useToast();
  const { data } = useSiteData();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const contact = data?.settings?.contactDetails || {};
  const social = data?.settings?.socialMedia || {};
  const items = section.items || [];
  const accent = section.accentColor;

  const socialLinks = SOCIALS.filter((s) => (social as Record<string, string | undefined>)[s.key]);
  const hasDetails = !!(contact.address || contact.phone || contact.whatsapp || contact.email) || items.length > 0 || socialLinks.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mirrors the API's own rules, so an incomplete form never round-trips.
    if (!form.name.trim() || !form.message.trim()) {
      toast({ title: "Please fill required fields", description: "Name and message are required.", variant: "destructive" });
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast({ title: "How should we reach you?", description: "Add an email address or a phone number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await contactMessages.submit(form);
      toast({ title: "Message sent", description: "Thank you — our team will get back to you soon." });
      setForm(EMPTY);
    } catch (error: any) {
      toast({ title: "Failed to send", description: error?.message || "Please try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));
  // Nothing usable in the field — empty, or a link that can't be framed — falls
  // back to mapping the office address, so the map is never a blank strip. The
  // builder flags a bad value there rather than letting it pass unnoticed here.
  const mapSrc = mapEmbedSrc(section.mapEmbedUrl) || mapEmbedSrc(contact.address);

  return (
    <div className="space-y-8">
      {/* Details card and form are the same height on desktop and stack on
          mobile with the details first — the address is what most visitors
          came for. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {hasDetails && (
          <Card className="h-full border-border/60 shadow-sm">
            <CardContent className="space-y-6 p-6 sm:p-7">
              <div>
                <h3 className="text-lg font-bold">Contact Details</h3>
                <p className="mt-1 text-sm text-muted-foreground">Reach us directly, or use the form beside this card.</p>
              </div>

              <ul className="space-y-4">
                {contact.address && <DetailRow icon={MapPin} label="Address" value={contact.address} badge={badge} />}
                {contact.phone && <DetailRow icon={Phone} label="Phone" value={contact.phone} href={telHref(contact.phone)} badge={badge} />}
                {contact.whatsapp && <DetailRow icon={MessageCircle} label="WhatsApp" value={contact.whatsapp} href={waHref(contact.whatsapp)} badge={badge} />}
                {contact.email && <DetailRow icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} badge={badge} />}
                {items.map((item, i) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <DetailRow
                      key={item._id || i}
                      icon={Icon}
                      label={item.title || ""}
                      value={item.description || ""}
                      href={item.link || undefined}
                      badge={iconBadgeStyle(item.color, accent)}
                    />
                  );
                })}
              </ul>

              {socialLinks.length > 0 && (
                <div className="border-t border-border/60 pt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow us</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {socialLinks.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.key}
                          href={(social as Record<string, string>)[s.key]}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={s.label}
                          title={s.label}
                          className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:-translate-y-0.5"
                          style={badge}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`h-full border-border/60 shadow-sm ${hasDetails ? "" : "mx-auto w-full max-w-2xl"}`}>
          <CardContent className="p-6 sm:p-7">
            <h3 className="text-lg font-bold">Send us a Message</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in the form and our team will respond as soon as possible.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input className="rounded-xl" placeholder="Your name *" autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
                <Input className="rounded-xl" placeholder="Phone" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input className="rounded-xl" type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
                <Input className="rounded-xl" placeholder="Subject" value={form.subject} onChange={(e) => set({ subject: e.target.value })} />
              </div>
              <Textarea className="rounded-xl" rows={5} placeholder="Your message *" value={form.message} onChange={(e) => set({ message: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                Name and message are required. Leave an email address or a phone number so we can reply.
              </p>
              <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-full sm:w-auto">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {section.ctaText || "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {mapSrc && (
        <div className="overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          <iframe
            src={mapSrc}
            title={section.title ? `${section.title} — location map` : "Location map"}
            className="h-[300px] w-full border-0 sm:h-[420px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
