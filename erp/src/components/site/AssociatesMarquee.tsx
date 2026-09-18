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
 * Two rows of partner logos, drifting end to end on their own.
 *
 * Two rows rather than one, and at different tile widths, is the live site's
 * arrangement: matching widths on both rows read as a single grid that had
 * failed to line up, whereas the wider second row reads as a deliberate
 * counterweight. The rows also run at different speeds and start at different
 * points in the list, so they never fall into lockstep.
 */
export function AssociatesMarquee({ logos }: { logos: AssociateLogo[] }) {
  if (logos.length === 0) return null;

  // Row two opens three logos further into the list, which keeps the same logo
  // from sitting directly above itself on the first pass.
  const shifted = [...logos.slice(3), ...logos.slice(0, 3)];

  const rows = [
    { items: logos, width: "w-[200px] sm:w-[246px]", duration: "64s", delay: "0s" },
    { items: shifted, width: "w-[250px] sm:w-[334px]", duration: "82s", delay: "-18s" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="associate-marquee overflow-hidden">
          <div
            className="associate-track"
            style={
              {
                "--marquee-duration": row.duration,
                "--marquee-delay": row.delay,
              } as CSSProperties
            }
          >
            {[...row.items, ...row.items].map((logo, i) => (
              <Tile
                key={`${rowIndex}-${logo.name}-${i}`}
                logo={logo}
                width={row.width}
                duplicate={i >= row.items.length}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
