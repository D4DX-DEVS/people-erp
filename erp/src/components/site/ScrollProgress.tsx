import { useEffect, useState } from "react";

/**
 * Hairline reading-progress bar pinned to the top of the viewport, above the
 * sticky header.
 *
 * The public pages are long — the home page alone runs past 12,000px — and a
 * two-pixel line is the cheapest way to answer "how much is left?" without
 * adding any chrome. The scroll handler writes a custom property straight onto
 * the node inside a rAF, so scrolling never triggers a React re-render.
 */
export function ScrollProgress() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!node) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      node.style.setProperty("--scroll-progress", String(pct));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [node]);

  return (
    <div
      ref={setNode}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-[image:var(--gradient-brand)] [transform:scaleX(var(--scroll-progress,0))]"
    />
  );
}
