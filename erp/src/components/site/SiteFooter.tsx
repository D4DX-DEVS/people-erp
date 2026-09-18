import { Link } from "react-router-dom";
import { Twitter } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { cn } from "@/lib/utils";
import { resolveOfficeContact } from "@/config/orgContact";
import { BrandMark } from "@/components/site/BrandMark";
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  LinkedinBrandIcon,
  YoutubeBrandIcon,
} from "@/components/site/SocialBrandIcons";
import type { SiteSettings } from "@/hooks/useSiteData";

interface SiteFooterProps {
  settings?: SiteSettings;
}

/** The shared link treatment for both navigation columns. */
const linkClass = "text-[17px] leading-[1.5] text-[#B3B3B3] transition-colors hover:text-white";

export function SiteFooter({ settings }: SiteFooterProps) {
  const { org } = useConfig();
  const contact = settings?.contactDetails || {};
  // Last-resort office details for this deployment — see config/orgContact.ts
  // for why the org payload alone is not enough.
  const office = resolveOfficeContact(org.key);
  const social = settings?.socialMedia || {};
  const footer = settings?.footer || {};
  const year = new Date().getFullYear();

  const address = contact.address || org.address || office.address;
  const phone = contact.phone || org.phone;
  const email = contact.email || org.email;

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

  // Ordered to match the live foundation site, which leads with Facebook and
  // LinkedIn. Twitter is kept last rather than dropped: this list has always
  // been filtered by which handles the franchise actually filled in, and an
  // empty entry simply does not render.
  const socials = [
    { url: social.facebook, Icon: FacebookBrandIcon, label: "Facebook" },
    { url: social.linkedin, Icon: LinkedinBrandIcon, label: "LinkedIn" },
    { url: social.instagram, Icon: InstagramBrandIcon, label: "Instagram" },
    { url: social.youtube, Icon: YoutubeBrandIcon, label: "YouTube" },
    // Twitter has no solid brand mark in the source design, so it keeps the
    // stroked lucide glyph rather than borrow another network's logo.
    { url: social.twitter, Icon: Twitter, label: "Twitter" },
  ].filter((s) => s.url);

  const primaryLinks = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/p/about-us" },
    { label: "Projects", href: "/projects-hub" },
    { label: "Updates", href: "/news" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms and Conditions", href: "/p/terms-and-conditions" },
    { label: "Refund and Cancellation Policy", href: "/p/refund-and-cancellation-policy" },
  ];

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
      <footer data-site-footer className="hidden lg:block">
        {/* A full-bleed black card that only rounds its top corners, so the page
            background shows through the notches. Ported from the live
            foundation site: 62px radius, 10px inset either side, and a 1300px
            content cap that only starts to bite on wide desktop. */}
        <div className="rounded-t-[62px] bg-black px-2.5 font-site">
          <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 pt-[60px] pb-[50px]">
            {/* Column widths are the live site's 30 / 15 / 25 / 30 split. The
                first navigation column carries the extra left padding that
                keeps "Home" clear of the wide logo column. */}
            <div className="flex w-full items-start">
              <div className="w-[30%] shrink-0 p-2.5">
                <BrandMark variant="footer" className="h-[69px] w-auto object-contain" />
              </div>

              <div className="w-[15%] shrink-0 p-2.5 pl-10">
                <ul className="space-y-[3px]">
                  {primaryLinks.map((l) => (
                    <li key={l.label}>
                      <Link to={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-[25%] shrink-0 p-2.5">
                <ul className="space-y-[3px]">
                  {legalLinks.map((l) => (
                    <li key={l.label}>
                      <Link to={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* min-w-0 down the column, plus a break rule on the address: a
                  place name like "Ponmuliparambu" and an email address are each
                  wider than this track, and a grid/flex track sizes to its
                  content by default, which pushed the footer past the viewport
                  and put a horizontal scrollbar on every page. It has to be
                  `anywhere` rather than `break-words` — only that shrinks an
                  element's min-content width, which is what the track measures. */}
              <div className="w-[30%] min-w-0 shrink-0 p-2.5">
                <ul className="space-y-[7px] text-[17px] leading-[1.5] text-[#B3B3B3]">
                  {address && <li className="min-w-0 [overflow-wrap:anywhere]">{address}</li>}
                  {email && (
                    <li className="min-w-0 [overflow-wrap:anywhere]">
                      <a href={`mailto:${email}`} className="transition-colors hover:text-white">
                        {email}
                      </a>
                    </li>
                  )}
                  {phone && (
                    <li>
                      <a href={`tel:${phone}`} className="transition-colors hover:text-white">
                        {phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Copyright and socials, split to the two edges with no rule
                between this row and the columns above — the live site separates
                them with spacing alone. */}
            <div className="flex w-full items-center justify-between gap-5 pt-2.5">
              <span className="text-base text-[#9D9B9B]">{copyright}</span>

              {socials.length > 0 && (
                <div className="flex shrink-0 items-center gap-[26px]">
                  {socials.map(({ url, Icon, label }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="text-white transition-opacity hover:opacity-70"
                    >
                      <Icon className="h-[25px] w-[25px]" />
                    </a>
                  ))}
                </div>
              )}
            </div>
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
