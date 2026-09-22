import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface AssociateLogo {
  name: string;
  src: string;
  href?: string;
}

/**
 * The tile is drawn from the live site: a hairline box on the page background
 * with 23px corners, holding a logo no taller than 60px.
 */
const TILE_CLASS =
  "flex h-[100px] shrink-0 items-center justify-center rounded-[23px] border border-[#E4E4E4] px-4 sm:h-[120px] sm:px-5";

/** Each tile carries its own trailing space — see the CSS note on the seam. */
const TILE_SPACING = "mr-4 sm:mr-5";

function Tile({
  logo,
  width,
  duplicate,
}: {
  logo: AssociateLogo;
  width: string;
  duplicate: boolean;
}) {
  const image = (
    <img
      src={logo.src}
      // The second copy of the list is repetition for the marquee's benefit,
      // not content: it stays out of the accessibility tree.
      alt={duplicate ? "" : logo.name}
      loading="lazy"
      decoding="async"
      className="max-h-[46px] w-auto max-w-full object-contain sm:max-h-[60px]"
    />
  );

  const box = cn(TILE_CLASS, TILE_SPACING, width);

  if (!logo.href) {
    return (
      <div className={box} aria-hidden={duplicate || undefined}>
        {image}
      </div>
    );
  }

  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      title={logo.name}
      tabIndex={duplicate ? -1 : undefined}
      className={cn(box, "transition-colors hover:border-primary/40")}
    >
      {image}
    </a>
  );
}

/**
 * A single row of partner logos, drifting end to end on its own.
 */
export function AssociatesMarquee({ logos }: { logos: AssociateLogo[] }) {
  if (logos.length === 0) return null;

  const width = "w-[200px] sm:w-[246px]";

  return (
    <div className="associate-marquee overflow-hidden">
      <div
        className="associate-track"
        style={
          {
            "--marquee-duration": "64s",
            "--marquee-delay": "0s",
          } as CSSProperties
        }
      >
        {[...logos, ...logos].map((logo, i) => (
          <Tile
            key={`${logo.name}-${i}`}
            logo={logo}
            width={width}
            duplicate={i >= logos.length}
          />
        ))}
      </div>
    </div>
  );
}
