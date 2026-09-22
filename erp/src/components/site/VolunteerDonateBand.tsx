import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Heart, HandHeart, ShieldCheck, Sprout, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/** Preset gift amounts, in rupees. */
const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

const TRUST_POINTS = [
  { Icon: ShieldCheck, label: "Secure\nTransactions" },
  { Icon: Sprout, label: "Direct Impact\non Families" },
  { Icon: Users, label: "Together for a\nStronger Kerala" },
];

interface VolunteerDonateBandProps {
  heading?: string;
  description?: string;
  paymentLink?: string;
  onVolunteer: () => void;
}

const formatINR = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

export function VolunteerDonateBand({ heading, description, paymentLink, onVolunteer }: VolunteerDonateBandProps) {
  const bandRef = useRef<HTMLDivElement>(null);

  // Scroll-linked widen: the band arrives slightly narrowed and expands to
  // full width as it travels into view — transform-only, so no layout shift.
  // Reduced-motion users get the static full-width band.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          bandRef.current,
          { scaleX: 0.94 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: bandRef.current,
              start: "top 95%",
              end: "top 45%",
              scrub: true,
            },
          },
        );
      });
    }, bandRef);
    return () => ctx.revert();
  }, []);

  const [amount, setAmount] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const customValue = Number(custom);
  const effective = customOpen && customValue > 0 ? customValue : amount;

  const choosePreset = (value: number) => {
    setAmount(value);
    setCustomOpen(false);
    setCustom("");
  };

  const donate = () => {
    if (paymentLink) window.open(paymentLink, "_blank", "noopener,noreferrer");
    else document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div ref={bandRef} className="grid gap-5 will-change-transform lg:grid-cols-2">
      {/* ── Become a Volunteer ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--secondary))] p-5 text-primary shadow-lg sm:p-7 md:p-10">
        <p aria-hidden className="pointer-events-none absolute right-6 top-6 hidden text-right font-serif text-lg italic leading-snug text-primary/70 sm:block">
          Together<br />for a Brighter<br />Tomorrow
          <span className="mt-1 block h-0.5 w-24 rounded-full bg-[hsl(var(--warning))]/70" />
        </p>

        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/60">
          <HandHeart className="h-7 w-7" />
        </div>

        <span className="mt-5 inline-block rounded-full bg-white/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          Get Involved
        </span>

        <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          Become a<br />
          <span className="text-[hsl(var(--warning))]">Volunteer</span>
        </h2>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-primary/80">
          Join hands with us to make a difference in the community. Your time and skills can bring real change.
        </p>

        <Button
          size="lg"
          className="mt-6 rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90"
          onClick={onVolunteer}
        >
          Join as a Volunteer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* ── Support our mission ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-5 text-primary-foreground shadow-lg sm:p-7 md:p-10">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          Support Our Mission
        </span>

        <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          {heading || "Your Zakat Can Transform Lives"}
        </h2>
        <p className="mt-2 text-sm text-primary-foreground/85">
          {description || "Be a part of this noble cause. Give Zakat. Earn Rewards."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {PRESET_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => choosePreset(value)}
              aria-pressed={!customOpen && amount === value}
              className={cn(
                "min-w-[92px] flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition",
                !customOpen && amount === value
                  ? "bg-[hsl(var(--warning))] text-white shadow-md"
                  : "bg-white text-primary hover:bg-white/90",
              )}
            >
              {formatINR(value)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            aria-expanded={customOpen}
            aria-controls="custom-amount"
            className={cn(
              "min-w-[110px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              customOpen ? "border-transparent bg-white text-primary" : "border-white/50 text-white hover:bg-white/10",
            )}
          >
            More Amount
          </button>
        </div>

        {/* Same 0fr→1fr technique as the donate card: animates to the panel's
            real height, so the field is never clipped. */}
        <div
          id="custom-amount"
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            customOpen ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <label className="block rounded-xl bg-white/10 p-3">
              <span className="mb-1.5 block text-xs font-semibold text-primary-foreground/80">
                Enter your own amount
              </span>
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-primary">
                <span className="text-sm font-bold">₹</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Amount"
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
            </label>
          </div>
        </div>

        <Button
          size="lg"
          onClick={donate}
          className="mt-4 w-full rounded-xl bg-[hsl(var(--warning))] py-6 text-base font-bold text-white hover:bg-[hsl(var(--warning))]/90"
        >
          <Heart className="mr-2 h-5 w-5" />
          {effective ? `Donate ${formatINR(effective)} Now` : "Donate Now"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Three across only from `sm`: on a phone each column was under 90px,
            which broke "Transactions" mid-word against the divider. */}
        <ul className="mt-6 grid grid-cols-1 gap-3 border-t border-white/15 pt-5 sm:grid-cols-3 sm:gap-2">
          {TRUST_POINTS.map(({ Icon, label }, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-[11px] leading-tight text-primary-foreground/85 sm:text-xs",
                i > 0 && "sm:border-l sm:border-white/15 sm:pl-3",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {/* Labels carry a newline to match the reference's two-line
                  wrap. Only `pre-line` honours it — under `sm` the default
                  collapses it to a space, so the stacked row reads as one
                  line without needing a second copy of each label. */}
              <span className="whitespace-normal sm:whitespace-pre-line">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
