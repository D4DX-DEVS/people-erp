import { useEffect, useRef, type MutableRefObject } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface AssociateLogo {
  name: string;
  src: string;
  /** External URL, or an internal in-site path (e.g. "/p/some-page"). */
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

/** An internal path starts with "/" (e.g. "/p/about-us"); anything else is external. */
const isInternalHref = (href: string) => href.startsWith("/");

function Tile({
  logo,
  width,
  duplicate,
  dragSuppressRef,
}: {
  logo: AssociateLogo;
  width: string;
  duplicate: boolean;
  /** True for the moment after a real drag ends, so the resulting click doesn't also navigate. */
  dragSuppressRef: MutableRefObject<boolean>;
}) {
  const image = (
    <img
      src={logo.src}
      // The second copy of the list is repetition for the marquee's benefit,
      // not content: it stays out of the accessibility tree.
      alt={duplicate ? "" : logo.name}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="max-h-[46px] w-auto max-w-full select-none object-contain sm:max-h-[60px]"
    />
  );

  // Full colour at rest, grey under the pointer (or keyboard focus) — the
  // hovered logo reads as "pressed" while the rest of the row stays lively.
  const box = cn(
    TILE_CLASS, TILE_SPACING, width,
    "transition-[filter,border-color] duration-300 hover:grayscale focus-visible:grayscale",
  );
  const suppressDragClick = (e: React.MouseEvent) => {
    if (dragSuppressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!logo.href) {
    return (
      <div className={box} aria-hidden={duplicate || undefined}>
        {image}
      </div>
    );
  }

  const linkClass = cn(box, "hover:border-primary/40");

  if (isInternalHref(logo.href)) {
    return (
      <Link
        to={logo.href}
        title={logo.name}
        tabIndex={duplicate ? -1 : undefined}
        draggable={false}
        className={linkClass}
        onClickCapture={suppressDragClick}
      >
        {image}
      </Link>
    );
  }

  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      title={logo.name}
      tabIndex={duplicate ? -1 : undefined}
      draggable={false}
      className={linkClass}
      onClickCapture={suppressDragClick}
    >
      {image}
    </a>
  );
}

/** Auto-drift speed, in px/s. */
const DESKTOP_SPEED = 40;
/** Phones show two tiles at once, so the same px/s reads much faster there. */
const MOBILE_SPEED = 24;
const MOBILE_QUERY = "(max-width: 639px)";
/** Pointer movement (px) beyond which a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 6;

/**
 * A single row of partner logos, drifting end to end on its own — and
 * draggable: mouse-drag on desktop, touch-drag on mobile, both through the
 * Pointer Events API so one set of handlers covers both inputs.
 *
 * One float position (px along the track) is the single source of truth;
 * it is applied as a transform. `scrollLeft` was tried first and rounded to
 * whole pixels each frame, quantising any speed to 1px/frame and clamping a
 * backwards drag at 0. The list is duplicated so the position can wrap by
 * exactly one copy's width — `scrollWidth / 2` — and show no seam.
 */
export function AssociatesMarquee({ logos }: { logos: AssociateLogo[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const halfWidthRef = useRef(0);
  const draggingRef = useRef(false);
  const dragSuppressRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, position: 0 });
  const rafRef = useRef<number>();
  const lastTsRef = useRef<number | null>(null);

  const width = "w-[200px] sm:w-[246px]";

  const apply = (next: number) => {
    const half = halfWidthRef.current;
    positionRef.current = half > 0 ? ((next % half) + half) % half : next;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-positionRef.current}px, 0, 0)`;
  };

  // One copy's width (the track holds the list twice), re-measured whenever
  // the tiles change size across a breakpoint.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => { halfWidthRef.current = track.scrollWidth / 2; apply(positionRef.current); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [logos]);

  useEffect(() => {
    if (!logos.length) return;
    const el = viewportRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia(MOBILE_QUERY);

    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(ts - lastTsRef.current, 100) / 1000;
      lastTsRef.current = ts;
      // Pause under the pointer, while anything in the row holds focus, and
      // while the visitor is dragging (the pointer handlers own the position then).
      if (!draggingRef.current && !reduceMotion.matches && !el.matches(":hover, :focus-within")) {
        apply(positionRef.current + (mobile.matches ? MOBILE_SPEED : DESKTOP_SPEED) * dt);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [logos.length]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    // Only the primary mouse button drags; touch/pen always drag.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Capture is what lets the drag keep tracking once the pointer leaves the
    // element's bounds — a nice-to-have, not a requirement, so a browser that
    // refuses it (some touch/pen edge cases throw "no active pointer") must
    // not abort the rest of this handler and silently break the drag.
    try { el.setPointerCapture(e.pointerId); } catch { /* dragging still works without capture */ }
    draggingRef.current = true;
    dragSuppressRef.current = false;
    pointerStartRef.current = { x: e.clientX, position: positionRef.current };
    el.classList.add("associate-marquee--grabbing");
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    if (Math.abs(dx) > DRAG_THRESHOLD) dragSuppressRef.current = true;
    apply(pointerStartRef.current.position - dx);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const el = viewportRef.current;
    el?.classList.remove("associate-marquee--grabbing");
    try { el?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    // Let the suppression flag survive just long enough for the synthetic
    // click that follows pointerup on whichever tile the drag ended over.
    if (dragSuppressRef.current) setTimeout(() => { dragSuppressRef.current = false; }, 0);
  };

  if (logos.length === 0) return null;

  return (
    <div
      ref={viewportRef}
      className="associate-marquee overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div ref={trackRef} className="associate-track">
        {[...logos, ...logos].map((logo, i) => (
          <Tile
            key={`${logo.name}-${i}`}
            logo={logo}
            width={width}
            duplicate={i >= logos.length}
            dragSuppressRef={dragSuppressRef}
          />
        ))}
      </div>
    </div>
  );
}
