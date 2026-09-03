import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu, X, Heart, HandHeart, User, LogIn, Phone, Mail, ArrowRight, ExternalLink, ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/ConfigContext";
import { useOrgLogoUrl } from "@/hooks/useOrgLogoUrl";
import { usePublicPages } from "@/hooks/useSitePages";
import { useSiteData } from "@/hooks/useSiteData";
import {
  resolveNavigation,
  type NavigationSettings, type NavItem, type NavLink, type NavButton,
} from "@/types/siteNavigation";
import { SiteTheme } from "@/components/site/SiteTheme";
import defaultLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const BUTTON_ICONS: Record<string, LucideIcon> = {
  heart: Heart, "hand-heart": HandHeart, user: User, "log-in": LogIn,
  phone: Phone, mail: Mail, "arrow-right": ArrowRight, external: ExternalLink,
};

// Where the link group sits between the logo and the action buttons.
const ALIGN_CLASS: Record<string, string> = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };

const LINK_CLASS = "rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground";
const HOME_LINK: NavLink = { label: "Home", kind: "home", target: "/" };

interface SiteHeaderProps {
  donateLink?: string;
  /** Override the stored config (used by the admin live preview). */
  navigation?: NavigationSettings;
  /** Inline, desktop-only, non-navigating rendering for the settings page. */
  preview?: boolean;
}

export function SiteHeader({ donateLink: donateLinkProp, navigation: navigationProp, preview = false }: SiteHeaderProps) {
  const { org } = useConfig();
  const orgLogoUrl = useOrgLogoUrl();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const { data: siteData } = useSiteData();
  const { data: publicPages } = usePublicPages();

  const settings = siteData?.settings;
  const donateLink = donateLinkProp ?? (settings?.donation?.paymentLink || settings?.hero?.ctaLink);
  const { menuAlignment, items, buttons } = resolveNavigation(
    navigationProp ?? settings?.navigation,
    publicPages || [],
    donateLink,
  );

  const go = (link: NavLink) => {
    if (preview) return;
    setOpen(false);
    const target = link.kind === "donate" ? donateLink : link.target;
    if (!target) return;

    const isExternal = /^(https?:)?\/\//i.test(target);
    const isProtocol = /^(mailto|tel|whatsapp|sms):/i.test(target);
    if (link.openInNewTab) {
      window.open(target, "_blank", "noopener");
      return;
    }
    if (isExternal || isProtocol) {
      window.location.assign(target);
      return;
    }

    const anchor = target.startsWith("/#") ? target.slice(2) : target.startsWith("#") ? target.slice(1) : null;
    if (anchor === null) {
      navigate(target);
      return;
    }
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderButton = (b: NavButton, i: number, mobile = false) => {
    const Icon = BUTTON_ICONS[b.icon];
    return (
      <Button
        key={b._id || i}
        variant={b.style === "outline" ? "outline" : "default"}
        className={cn(
          "rounded-full",
          b.style !== "outline" && "shadow-glow",
          mobile ? "mt-2 w-full" : preview ? "inline-flex" : "hidden sm:inline-flex",
        )}
        onClick={() => go(b)}
      >
        {Icon && <Icon className="mr-1 h-4 w-4" />}
        {b.label}
      </Button>
    );
  };

  return (
    <header
      className={cn(
        preview
          ? "relative rounded-xl border border-border/60 bg-background shadow-sm"
          : "sticky top-0 z-50 border-b border-border/40 bg-background/80 shadow-sm backdrop-blur-xl",
      )}
    >
      {!preview && (
        <SiteTheme primary={settings?.appearance?.primaryColor} gradient={settings?.appearance?.gradientColor} />
      )}
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <button onClick={() => go(HOME_LINK)} className="flex shrink-0 items-center gap-3">
          <img
            src={orgLogoUrl}
            alt={org.erpTitle}
            className="h-11 w-11 rounded-2xl shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultLogo; }}
          />
          <div className="text-left">
            <h1 className="text-base font-bold leading-tight md:text-lg">{org.displayName || org.erpTitle}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{org.tagline}</p>
          </div>
        </button>

        <nav className={cn("flex-wrap items-center gap-1", preview ? "flex" : "hidden lg:flex", ALIGN_CLASS[menuAlignment])}>
          {items.map((item, i) =>
            item.type === "dropdown" ? (
              <DesktopDropdown key={item._id || i} item={item} onGo={go} alignRight={menuAlignment === "right"} />
            ) : (
              <button key={item._id || i} onClick={() => go(item)} className={LINK_CLASS}>
                {item.label}
              </button>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {buttons.map((b, i) => renderButton(b, i))}
          {!preview && (
            <button
              className="rounded-full p-2 hover:bg-muted lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {!preview && (
        <div className={cn("lg:hidden", open ? "block" : "hidden")}>
          <nav className="container mx-auto flex flex-col gap-1 px-4 pb-4">
            {items.map((item, i) =>
              item.type === "dropdown" ? (
                <div key={item._id || i}>
                  <button
                    onClick={() => setOpenGroups((g) => ({ ...g, [i]: !g[i] }))}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
                    aria-expanded={!!openGroups[i]}
                  >
                    {item.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openGroups[i] && "rotate-180")} />
                  </button>
                  {openGroups[i] && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-border/60 pl-2">
                      {(item.children || []).map((c, j) => (
                        <button
                          key={c._id || j}
                          onClick={() => go(c)}
                          className="rounded-lg px-3 py-2 text-left text-sm text-foreground/70 hover:bg-muted"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item._id || i}
                  onClick={() => go(item)}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
                >
                  {item.label}
                </button>
              ),
            )}
            {buttons.map((b, i) => renderButton(b, i, true))}
          </nav>
        </div>
      )}
    </header>
  );
}

/** Hover / focus / click-opened dropdown for the desktop bar. */
function DesktopDropdown({ item, onGo, alignRight }: { item: NavItem; onGo: (l: NavLink) => void; alignRight: boolean }) {
  const [clicked, setClicked] = useState(false);

  return (
    <div
      className="group relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setClicked(false); }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={clicked}
        onClick={() => setClicked((v) => !v)}
        className={cn(LINK_CLASS, "inline-flex items-center gap-1 group-hover:bg-muted group-hover:text-foreground")}
      >
        {item.label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div
        className={cn(
          "invisible absolute top-full z-50 min-w-[220px] pt-2 opacity-0 transition-all duration-150",
          "group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          clicked && "visible opacity-100",
          alignRight ? "right-0" : "left-0",
        )}
      >
        <div className="rounded-2xl border border-border/60 bg-background p-2 shadow-xl">
          {(item.children || []).map((c, j) => (
            <button
              key={c._id || j}
              type="button"
              onClick={() => { setClicked(false); onGo(c); }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              <span>{c.label}</span>
              {c.openInNewTab && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
