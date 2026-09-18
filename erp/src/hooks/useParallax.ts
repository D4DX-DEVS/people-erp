import { useEffect, useRef } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const COARSE_POINTER = "(hover: none), (pointer: coarse)";

const prefers = (query: string) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

/**
 * Drifts an element against the page scroll to give a card depth.
 *
 * The element's distance from the middle of the viewport is mapped to -1..1 and
 * written straight onto the node as the `--parallax-y` custom property — never
 * through React state, so a grid of cards costs no re-renders while scrolling.
 * Pair it with the `.parallax-media` class in index.css, which turns the
 * variable into a `translate3d`.
 *
 * `strength` is the maximum shift in pixels; vary it per card so neighbours
 * drift at different rates, which is what reads as parallax. The media it moves
 * has to be taller than its frame by at least `strength` on each side, or the
 * drift exposes an edge.
 *
 * Nothing is observed for users who ask for reduced motion — the media simply
 * sits still.
 */
export function useParallax<T extends HTMLElement = HTMLElement>(strength = 30) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefers(REDUCED_MOTION)) return;

    let frame = 0;
    // Only cards on screen are measured; the observer flips this as they enter
    // and leave, so a long page does no work for the cards far below.
    let onScreen = true;

    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const distance = rect.top + rect.height / 2 - viewport / 2;
      const progress = distance / (viewport / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      el.style.setProperty("--parallax-y", `${(clamped * strength).toFixed(2)}px`);
    };

    const schedule = () => {
      if (onScreen && !frame) frame = requestAnimationFrame(apply);
    };

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          schedule();
        },
        { rootMargin: "120px 0px" },
      );
      observer.observe(el);
    }

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [strength]);

  return ref;
}

/**
 * Tips a card towards the pointer. Writes `--tilt-x` / `--tilt-y` onto the node
 * for the `.tilt-card` class in index.css, which also carries the perspective
 * and the `preserve-3d` that lets `.tilt-layer` children float above the face.
 *
 * Skipped on touch and coarse pointers — there is no hover to drive it, and the
 * listeners would only fire on tap — and for reduced motion.
 */
export function useTilt<T extends HTMLElement = HTMLElement>(max = 7) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefers(REDUCED_MOTION) || prefers(COARSE_POINTER)) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty("--tilt-y", `${(x * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--tilt-x", `${(-y * max * 2).toFixed(2)}deg`);
      });
    };

    const reset = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("blur", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("blur", reset);
    };
  }, [max]);

  return ref;
}

/**
 * Parallax strengths for a row of cards, cycled by index so adjacent cards
 * never drift at the same rate.
 */
const DEPTHS = [34, 18, 46, 26];

export const depthForIndex = (index = 0) => DEPTHS[index % DEPTHS.length];

/**
 * Publishes how far the pointer is from the centre of an element as
 * `--pointer-x` / `--pointer-y`, each running -1..1 (centre = 0).
 *
 * This is what drives the hero's layered parallax: the hook writes the two
 * custom properties on the hero section, and every layer inside declares its
 * own `--depth` in CSS (see `.hero-layer`), so one pointer listener moves the
 * artwork, the decorations and the copy past each other at different rates.
 * No React state is touched, so tracking the pointer never re-renders the hero.
 *
 * Skipped entirely for reduced motion and for coarse pointers — a phone has no
 * hover to track, and the layers just sit flat.
 */
export function usePointerParallax<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefers(REDUCED_MOTION) || prefers(COARSE_POINTER)) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      el.style.setProperty("--pointer-x", x.toFixed(4));
      el.style.setProperty("--pointer-y", y.toFixed(4));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const clamp = (n: number) => Math.max(-1, Math.min(1, n));

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
      schedule();
    };

    const reset = () => {
      x = 0;
      y = 0;
      schedule();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("blur", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("blur", reset);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
