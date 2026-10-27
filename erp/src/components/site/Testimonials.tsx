import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface TestimonialData {
  _id: string;
  name: string;
  designation?: string;
  location?: string;
  comment: string;
  photoUrl?: string;
}

/** Comments longer than this are clamped on the card and open in full in a dialog. */
const LONG_COMMENT = 260;

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

function Avatar({ t, className }: { t: TestimonialData; className?: string }) {
  return t.photoUrl ? (
    <img src={t.photoUrl} alt={t.name} loading="lazy" className={cn("rounded-full object-cover ring-2 ring-white shadow", className)} />
  ) : (
    <span className={cn("flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ring-2 ring-white shadow", className)}>
      {initials(t.name)}
    </span>
  );
}

const subline = (t: TestimonialData) => [t.designation, t.location].filter(Boolean).join(" · ");

export function TestimonialCard({ t, className }: { t: TestimonialData; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = t.comment.length > LONG_COMMENT;

  return (
    <figure className={cn("relative flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-7", className)}>
      <Quote className="h-9 w-9 shrink-0 fill-primary/15 text-primary/40" aria-hidden />
      <blockquote className="mt-3 flex-1">
        <p className={cn("whitespace-pre-line text-[15px] leading-relaxed text-foreground/80", long && "line-clamp-6")}>{t.comment}</p>
        {long && (
          <button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm font-medium text-primary hover:underline">
            Read more
          </button>
        )}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
        <Avatar t={t} className="h-12 w-12 shrink-0 text-sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.name}</p>
          {subline(t) && <p className="truncate text-sm text-muted-foreground">{subline(t)}</p>}
        </div>
      </figcaption>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar t={t} className="h-12 w-12 shrink-0 text-sm" />
              <div className="min-w-0 text-left">
                <DialogTitle>{t.name}</DialogTitle>
                {subline(t) && <DialogDescription>{subline(t)}</DialogDescription>}
              </div>
            </div>
          </DialogHeader>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">“{t.comment}”</p>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

/**
 * Testimonials laid out for any count: up to three sit in a centred grid;
 * more scroll sideways one card at a time with arrow controls.
 */
export function TestimonialsList({ items }: { items: TestimonialData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  if (items.length <= 3) {
    return (
      <div className={cn("mx-auto grid gap-5", items.length === 1 ? "max-w-xl" : items.length === 2 ? "max-w-4xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {items.map((t) => <TestimonialCard key={t._id} t={t} />)}
      </div>
    );
  }

  const nudge = (dir: number) => {
    const el = trackRef.current;
    const first = el?.querySelector<HTMLElement>(":scope > *");
    el?.scrollBy({ left: dir * ((first?.offsetWidth || 320) + 20), behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-2"
      >
        {items.map((t) => (
          <TestimonialCard key={t._id} t={t} className="h-auto w-[85%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]" />
        ))}
      </div>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" aria-label="Previous" onClick={() => nudge(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-primary hover:text-primary-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Next" onClick={() => nudge(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-primary hover:text-primary-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
