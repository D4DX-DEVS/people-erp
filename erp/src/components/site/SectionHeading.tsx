import { Reveal } from "@/components/site/Reveal";
import { AnimatedTitle } from "@/components/site/AnimatedTitle";
import { cn } from "@/lib/utils";
import { colorValue, colorTint } from "@/lib/siteColors";
import type { HomeHeadingStyle } from "@/types/siteHome";

/** Inline colour for an admin-picked heading colour; nothing when unset so the default classes apply. */
export const textStyle = (color?: string) => (color ? { color: colorValue(color) } : undefined);

/** The eyebrow pill: text in the chosen colour on a soft tint of the same colour. */
export const eyebrowStyle = (color?: string) => (color ? { color: colorValue(color), backgroundColor: colorTint(color) } : undefined);

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  colors,
  accentFrom,
  divider = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Admin-picked colours from Website Settings → Home Page Layout. */
  colors?: HomeHeadingStyle;
  /** Colour the title's trailing words from this word index onward.
   *  Defaults to the final word, which is the house style for every section
   *  heading on this page — pass an explicit index only to accent more. */
  accentFrom?: number;
  divider?: boolean;
}) {
  const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
  // A one-word title accents nothing: colouring the whole heading loses the
  // two-tone effect and just reads as a differently coloured heading.
  const resolvedAccent = accentFrom ?? (wordCount > 1 ? wordCount - 1 : undefined);
  // The rule under the heading: two fading lines meeting at a diamond, drawn
  // in the brand colour unless the admin picked one.
  const dividerLine = colors?.dividerColor ? { backgroundImage: `linear-gradient(to right, transparent, ${colorTint(colors.dividerColor, 0.4)})` } : undefined;
  const dividerLineL = colors?.dividerColor ? { backgroundImage: `linear-gradient(to left, transparent, ${colorTint(colors.dividerColor, 0.4)})` } : undefined;
  const dividerDot = colors?.dividerColor ? { backgroundColor: colorTint(colors.dividerColor, 0.6) } : undefined;

  return (
    <div className="mx-auto mb-4 max-w-2xl text-center sm:mb-6">
      {eyebrow && (
        <Reveal as="span" className="mb-2 inline-block">
          <span
            className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider", !colors?.eyebrowColor && "bg-primary/10 text-primary")}
            style={eyebrowStyle(colors?.eyebrowColor)}
          >
            {eyebrow}
          </span>
        </Reveal>
      )}
      <AnimatedTitle
        as="h2" text={title} delay={90} accentFrom={resolvedAccent}
        className="text-2xl font-bold md:text-4xl"
        style={textStyle(colors?.titleColor)}
        accentStyle={textStyle(colors?.accentColor)}
      />
      {subtitle && (
        <Reveal as="p" delay={180} className={cn("mt-3", !colors?.subtitleColor && "text-muted-foreground")}>
          <span style={textStyle(colors?.subtitleColor)}>{subtitle}</span>
        </Reveal>
      )}
      {divider && (
        <Reveal delay={240} className="mt-4">
          <div aria-hidden className="flex items-center justify-center gap-2">
            <span className={cn("h-px w-12", !dividerLine && "bg-gradient-to-r from-transparent to-primary/40")} style={dividerLine} />
            <span className={cn("h-1.5 w-1.5 rotate-45", !dividerDot && "bg-primary/60")} style={dividerDot} />
            <span className={cn("h-px w-12", !dividerLineL && "bg-gradient-to-l from-transparent to-primary/40")} style={dividerLineL} />
          </div>
        </Reveal>
      )}
    </div>
  );
}

