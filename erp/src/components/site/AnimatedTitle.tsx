import { Fragment, type CSSProperties, type ElementType } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

interface AnimatedTitleProps {
  /** Plain text — the component splits it, so it cannot take rich children. */
  text: string;
  /** Heading level to render. Defaults to h2. */
  as?: ElementType;
  /** ms between consecutive words. */
  stagger?: number;
  /** ms before the first word moves. */
  delay?: number;
  /** Index of the first word to colour with `accentClassName`. */
  accentFrom?: number;
  accentClassName?: string;
  /** Inline style for the accented words — an admin-picked colour wins over `accentClassName`. */
  accentStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
}

/**
 * Reveals a heading one word at a time — each word slides up from behind its
 * own mask — the first time the heading scrolls into view.
 *
 * The split is presentation only: the full string stays on the element as
 * aria-label and the pieces are aria-hidden, so assistive tech reads one
 * heading rather than a list of words. Words are separated by real space text
 * nodes instead of a flex gap, which keeps the parent's text-align working
 * (headings here are centred by an ancestor).
 */
export function AnimatedTitle({
  text,
  as,
  stagger = 60,
  delay = 0,
  accentFrom,
  accentClassName = "text-primary",
  accentStyle,
  className,
  style,
}: AnimatedTitleProps) {
  const Tag = (as || "h2") as ElementType;
  const { ref, inView } = useInView<HTMLElement>();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      aria-label={text}
      className={cn("anim-title", inView && "is-visible", className)}
      style={style}
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {i > 0 ? " " : null}
          <span
            aria-hidden
            className={cn("anim-title-word", accentFrom !== undefined && i >= accentFrom && !accentStyle && accentClassName)}
            style={accentFrom !== undefined && i >= accentFrom ? accentStyle : undefined}
          >
            <span style={{ "--word-delay": `${delay + i * stagger}ms` } as CSSProperties}>{word}</span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
