import type { CSSProperties, ElementType, ReactNode } from "react";
import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Element to render. Defaults to a plain div. */
  as?: ElementType;
  /** Stagger, in ms, applied as the CSS animation-delay. */
  delay?: number;
  /** Visible fraction required to trigger. Defaults to 0 — any sliver counts,
   *  so sections taller than the viewport still fire. */
  threshold?: number;
  className?: string;
}

/**
 * Fades and lifts its children into view the first time they scroll into the
 * viewport, then stops observing — the animation plays once per page load, not
 * on every scroll past. `prefers-reduced-motion` disables the motion in CSS
 * (see the .reveal rules in index.css).
 *
 * Once the entrance finishes the wrapper swaps to `.is-done`, which drops the
 * animation entirely. That matters beyond tidiness: a finished transform
 * animation keeps resolving to an identity matrix, and an element with any
 * transform is a containing block for `position: fixed` descendants — which is
 * exactly what silently broke the Schemes card stack's ScrollTrigger pin,
 * since every home section is wrapped in one of these.
 */
export function Reveal({ children, as, delay = 0, threshold = 0, className }: RevealProps) {
  const Tag = (as || "div") as ElementType;
  const { ref, inView } = useInView<HTMLElement>({ threshold });
  const [done, setDone] = useState(false);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn("reveal", inView && "is-visible", done && "is-done", className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined}
      // animationend bubbles, and these wrappers hold whole sections whose
      // headings animate too — only the wrapper's own animation may end it.
      onAnimationEnd={(event: React.AnimationEvent<HTMLElement>) => {
        if (event.target === event.currentTarget) setDone(true);
      }}
    >
      {children}
    </Tag>
  );
}
