import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemeTheme } from "@/config/schemeThemes";
import { resolveIcon } from "@/lib/siteIcons";

export interface SchemeCardData {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
}

interface SchemeCardProps {
  scheme: SchemeCardData;
  onOpen: () => void;
}

/**
 * Scheme tile: copy on the left, a media panel curved into the card's right
 * edge, and a filled arrow straddling the seam between the two. Colour comes
 * from the scheme's category (see config/schemeThemes.ts) so the whole grid
 * reads as one system rather than six unrelated cards.
 */
export function SchemeCard({ scheme, onOpen }: SchemeCardProps) {
  const theme = schemeTheme(scheme.category);
  const Icon = resolveIcon(theme.icon);
  const name = scheme.name || scheme.title;
  const artwork = scheme.imageUrl || theme.image;

  return (
    <article
      className={cn(
        "group relative flex w-full overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        theme.card,
      )}
    >
      <div className="flex min-w-0 flex-[1.15] flex-col p-5">
        <div className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-full", theme.badge)}>
          <Icon className="h-5 w-5" />
        </div>
        {scheme.category && (
          <span className={cn("text-[11px] font-bold uppercase tracking-wider", theme.label)}>
            {scheme.category.replace(/_/g, " ")}
          </span>
        )}
        <h3 className="mt-1 text-lg font-bold leading-snug text-foreground">{name}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{scheme.description}</p>
        <button
          type="button"
          onClick={onOpen}
          className={cn("mt-auto inline-flex w-fit items-center pt-3 text-sm font-semibold", theme.link)}
        >
          Learn More <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Media panel. The photo's left corners use two different radii — a
          gentler sweep at the top, a deep scoop at the bottom — so the edge
          reads as an organic curve rather than a rounded rectangle, and the
          scoop gives the arrow a place to nest. */}
      <div className="relative w-[38%] shrink-0 sm:w-[40%]">
        {/* No tint behind the photo — the curved edge shows the card itself.
            drop-shadow (not box-shadow) is what follows the rounded corners, so
            the shadow traces the sweep instead of boxing the panel. */}
        {artwork ? (
          <img
            src={artwork}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full rounded-tl-[3rem] rounded-bl-[5.5rem] object-cover [filter:drop-shadow(-6px_0_10px_rgb(0_0_0/0.14))]"
          />
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center rounded-tl-[3rem] rounded-bl-[5.5rem] bg-gradient-to-br [filter:drop-shadow(-6px_0_10px_rgb(0_0_0/0.14))]",
            theme.panel,
          )}>
            <Icon className={cn("h-14 w-14 opacity-25", theme.label)} />
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${name}`}
          className={cn(
            // Sits inside the bottom-left scoop, above the photo layer.
            "absolute bottom-4 left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300 group-hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            theme.button,
          )}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
