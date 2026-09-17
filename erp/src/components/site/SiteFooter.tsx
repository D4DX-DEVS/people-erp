import { Facebook, Instagram, Youtube, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useConfig } from "@/contexts/ConfigContext";
import { cn } from "@/lib/utils";
import { resolveOfficeContact } from "@/config/orgContact";
import { BrandMark } from "@/components/site/BrandMark";
import type { SiteSettings } from "@/hooks/useSiteData";

interface SiteFooterProps {
  settings?: SiteSettings;
}

export function SiteFooter({ settings }: SiteFooterProps) {
  const { org } = useConfig();
  const contact = settings?.contactDetails || {};
  // Last-resort office details for this deployment — see config/orgContact.ts
  // for why the org payload alone is not enough.
  const office = resolveOfficeContact(org.key);
  const social = settings?.socialMedia || {};
  const footer = settings?.footer || {};
  const year = new Date().getFullYear();

  // org.copyrightText is built from the org's copyrightHolder (orgConfig.js /
  // the franchise record), which is the name that belongs on a copyright line —
  // displayName is the shorter label used in headers and menus, and the two are
  // deliberately not the same string.
  const copyright =
    footer.copyrightText ||
    org.copyrightText ||
    `© ${year} ${org.displayName || org.erpTitle}. All rights reserved.`;

  // Rendered on the dark footer and again on the light mobile strip, so the
  // link's colour has to come from the caller — a single fixed class would be
  // invisible on one of the two grounds.
  const poweredBy = (linkClassName: string) => (
    <>
      Powered by:{" "}
      <a
        href="https://d4dx.co/"
        target="_blank"
        rel="noopener noreferrer"
        className={cn("font-medium underline-offset-4 transition-colors hover:underline", linkClassName)}
      >
        D4DX Innovations
      </a>
    </>
  );

  const socials = [
    { url: social.facebook, Icon: Facebook, label: "Facebook" },
    { url: social.instagram, Icon: Instagram, label: "Instagram" },
    { url: social.youtube, Icon: Youtube, label: "YouTube" },
    { url: social.twitter, Icon: Twitter, label: "Twitter" },
    { url: social.linkedin, Icon: Linkedin, label: "LinkedIn" },
  ].filter((s) => s.url);

  return (
    <>
      {/* The full footer is desktop only. Below `lg` the public site runs as an
          app shell — the bottom tab bar carries navigation and the drawer
          carries the contact details and social links, so a tall stacked footer
          under it would just be a third copy of the same menu (see
          MobileBottomNav / SiteHeader). Only the copyright and build credit
          survive at that width, in the strip at the end of this component.

          data-site-footer marks this as *the* site footer: BackToTop parks
          itself above it, and the page has other <footer> elements (a
          blockquote credit in the Zakat calculator, for one) that a bare tag
          selector would catch. The mobile strip below carries the same marker:
          BackToTop measures whichever of the two the current width renders, so
          it parks above the copyright line at every size. */}
      <footer data-site-footer className="hidden bg-gradient-hero text-primary-foreground lg:block">
        {/* divide-x draws the 1px rule on every column but the first. It only
            applies from lg up, where the columns actually sit side by side — on
            the stacked mobile layout it would render as stray left borders. */}
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-white/15">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-2">
            {/* The footer variant is the light-on-dark lockup, so it needs no
                plate behind it and no filter — the earlier brightness-0/invert
                trick flattened the emblem's detail into a silhouette. */}
            <BrandMark variant="footer" className="h-14 w-auto object-contain" />
            <p className="text-sm leading-relaxed text-primary-foreground/80">
              {footer.description || org.aboutText || org.tagline}
            </p>
            {socials.length > 0 && (
              <div className="flex gap-2 pt-1">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition-colors hover:bg-[hsl(var(--warning))]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="lg:pl-10">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              {[
                { label: "Home", href: "/" },
                { label: "About Us", href: "/#about" },
                { label: "Zakat", href: "/#calculator" },
                { label: "Projects", href: "/projects-hub" },
                { label: "Schemes", href: "/schemes" },
                { label: "News & Events", href: "/news" },
                { label: "Branches", href: "/p/contact-us" },
              ].map((l) => (
                <li key={l.label}>
                  {l.href.includes("#") ? (
                    <a href={l.href} className="transition-colors hover:text-white">{l.label}</a>
                  ) : (
                    <Link to={l.href} className="transition-colors hover:text-white">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="lg:pl-10">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Resources</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              {[
                { label: "Zakat Calculator", href: "/#calculator" },
                { label: "Brochures & Reports", href: "/download" },
                { label: "Gallery", href: "/gallery" },
                { label: "FAQ", href: "/#faq" },
                { label: "Privacy Policy", href: "/privacy-policy" },
              ].map((l) => (
                <li key={l.label}>
                  {l.href.includes("#") ? (
                    <a href={l.href} className="transition-colors hover:text-white">{l.label}</a>
                  ) : (
                    <Link to={l.href} className="transition-colors hover:text-white">{l.label}</Link>
                  )}
                </li>
              ))}
              {(footer.links || []).map((l, i) => (
                <li key={i}>
                  {l.url?.startsWith("/") ? (
                    <Link to={l.url} className="transition-colors hover:text-white">{l.label}</Link>
                  ) : (
                    <a href={l.url} className="transition-colors hover:text-white">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Get in touch */}
          {/* min-w-0 all the way down, plus a break rule on the two fields that
              can be single long tokens. An email address and a place name like
              "Ponmuliparambu" are each wider than this 1/5 column, and a grid
              track grows to its content by default — that widened the footer
              past the viewport and put a horizontal scrollbar on every page.
              It has to be `anywhere`/`break-all` rather than `break-words`:
              only those two shrink an element's min-content width, which is what
              the track is actually sized from. */}
          <div className="min-w-0 lg:pl-10">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Get in touch</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              {(contact.address || org.address || office.address) && (
                <li className="flex min-w-0 gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{contact.address || org.address || office.address}</span>
                </li>
              )}
              {(contact.phone || org.phone) && (
                <li className="flex min-w-0 gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                  <a href={`tel:${contact.phone || org.phone}`} className="hover:text-white">{contact.phone || org.phone}</a>
                </li>
              )}
              {(contact.email || org.email) && (
                <li className="flex min-w-0 gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                  <a href={`mailto:${contact.email || org.email}`} className="min-w-0 break-all hover:text-white">{contact.email || org.email}</a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 py-5">
          {/* Three even tracks so the legal links sit dead centre of the bar,
              not merely centred in the space left over between its neighbours. */}
          <div className="container mx-auto grid gap-3 px-4 text-center text-xs text-primary-foreground/70 sm:grid-cols-3 sm:items-center">
            <span className="sm:text-left">{copyright}</span>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/p/terms-and-conditions" className="hover:text-white">Terms &amp; Conditions</Link>
              <Link to="/p/disclaimer" className="hover:text-white">Disclaimer</Link>
            </div>

            <span className="sm:text-right">
              {poweredBy("text-primary-foreground/90 hover:text-white")}
            </span>
          </div>
        </div>
      </footer>

      {/* Below `lg` the tall footer is gone, but the copyright line and the build
          credit still have to appear — so they get their own strip, which sits
          just above MobileBottomNav's spacer and so clears the fixed tab bar.
          Deliberately a quiet line on the page background rather than a second
          brand-coloured band: the legal links it used to carry live in the
          drawer, and the tab bar already sits right underneath it. */}
      <div
        data-site-footer
        className="border-t border-border/60 bg-background px-4 py-4 text-center text-muted-foreground lg:hidden"
      >
        <p className="text-[11px] leading-relaxed [overflow-wrap:anywhere]">{copyright}</p>
        <p className="mt-1 text-[11px] leading-relaxed">
          {poweredBy("text-foreground hover:text-primary")}
        </p>
      </div>
    </>
  );
}
