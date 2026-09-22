import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Visible fraction required to trigger. Defaults to 0 — any sliver counts,
   *  so sections taller than the viewport still fire. */
  threshold?: number;
  rootMargin?: string;
}

/**
 * Safety net for the IntersectionObserver below.
 *
 * IntersectionObserver only reports *changes*, and it samples intersections on
 * the rendering steps it happens to run on. Scroll a long jump — the End key, a
 * deep link, a restored scroll position — and a section can go from "below the
 * fold" to "above the fold" without ever being sampled as intersecting. It then
 * stays at the `.reveal` starting opacity of 0 forever, so the user sees a
 * blank band where a heading should be.
 *
 * This registry re-checks pending elements on a single rAF-throttled listener
 * using the same rule the observer applies (top edge past the viewport bottom,
 * less the 60px margin). One listener covers every pending element, and it is
 * removed again as soon as the registry empties — which is shortly after load
 * on a normal read, since every element leaves once it has been reached.
 */
const pending = new Set<{ el: HTMLElement; show: () => void }>();
let frame = 0;

function sweep() {
  frame = 0;
  const limit = window.innerHeight - 60;
  for (const item of [...pending]) {
    // Above the fold counts too: the user has already passed it, so it must
    // not be left invisible behind them.
    if (item.el.getBoundingClientRect().top >= limit) continue;
    pending.delete(item);
    item.show();
  }
  if (pending.size === 0) stopSweeping();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sweep);
}

function stopSweeping() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
}

function register(item: { el: HTMLElement; show: () => void }) {
  if (pending.size === 0) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  pending.add(item);
  schedule();
  return () => {
    pending.delete(item);
    if (pending.size === 0) stopSweeping();
  };
}

/**
 * Reports the first time an element scrolls into the viewport, then stops
 * observing — callers animate once per page load, not on every scroll past.
 * Falls back to "already in view" when IntersectionObserver is unavailable so
 * content is never left hidden.
 */
export function useInView<T extends HTMLElement = HTMLElement>({
  threshold = 0,
  rootMargin = "0px 0px -60px 0px",
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    // Elements already on screen at mount (above the fold) intersect on the
    // observer's first callback, so they show without waiting for a scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );
    observer.observe(el);

    const unregister = register({ el, show: () => setInView(true) });

    return () => {
      observer.disconnect();
      unregister();
    };
  }, [threshold, rootMargin]);

  return { ref, inView };
}
