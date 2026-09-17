import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Visible fraction required to trigger. Defaults to 0 — any sliver counts,
   *  so sections taller than the viewport still fire. */
  threshold?: number;
  rootMargin?: string;
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
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}
