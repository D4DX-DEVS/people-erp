import { useMemo, useState, type ChangeEventHandler } from "react";
import {
  ArrowRight, BarChart3, Briefcase, Calculator, Coins, FileText, HelpCircle,
  Info, Landmark, PieChart, RefreshCw, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import zakatArtwork from "@/assets/schemes/livelihood.jpg";

// Approximate market rates used only to convert grams into currency for the
// calculator. Zakat is 2.5% of net zakatable assets, the standard rate.
const GOLD_RATE_PER_GRAM = 6500;
const SILVER_RATE_PER_GRAM = 85;
const ZAKAT_RATE = 0.025;

const INITIAL_VALUES = {
  cash: "",
  goldGrams: "",
  silverGrams: "",
  investments: "",
  business: "",
  other: "",
  liabilities: "",
};

interface FieldDef {
  key: keyof typeof INITIAL_VALUES;
  label: string;
  icon: typeof Wallet;
  /** Tint for the field's icon chip — gold and silver read as metals, the rest
   *  as ordinary money, which is why they are not all one colour. */
  tint: string;
  isGrams?: boolean;
  rate?: number;
}

// Six asset fields fill three even two-column rows, so the grid never ends on a
// lone orphaned cell. Gold and silver share the left column because their rate
// hints make those cells taller — pairing them keeps each row balanced.
const ASSET_FIELDS: FieldDef[] = [
  { key: "cash", label: "Cash & Bank Balance", icon: Landmark, tint: "bg-emerald-50 text-emerald-700" },
  { key: "business", label: "Business Assets", icon: Briefcase, tint: "bg-emerald-50 text-emerald-700" },
  { key: "goldGrams", label: "Gold (grams)", icon: Coins, tint: "bg-amber-50 text-amber-600", isGrams: true, rate: GOLD_RATE_PER_GRAM },
  { key: "other", label: "Other Assets", icon: PieChart, tint: "bg-emerald-50 text-emerald-700" },
  { key: "silverGrams", label: "Silver (grams)", icon: Coins, tint: "bg-slate-100 text-slate-500", isGrams: true, rate: SILVER_RATE_PER_GRAM },
  { key: "investments", label: "Investments", icon: BarChart3, tint: "bg-emerald-50 text-emerald-700" },
];

const num = (v: string) => (v ? Math.max(0, parseFloat(v) || 0) : 0);

const inr = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function MoneyField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  const Icon = field.icon;
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", field.tint)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor={field.key} className="block text-sm font-medium text-foreground/80">
          {field.label}
        </label>
        <div className="relative">
          {!field.isGrams && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
          )}
          <Input
            id={field.key}
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={onChange}
            className={cn(
              "rounded-xl border-border/70 transition focus-visible:border-[hsl(var(--brand-green))] focus-visible:ring-[hsl(var(--brand-green))]/25",
              field.isGrams ? "pr-10 pl-7" : "pl-7",
            )}
          />
          {field.isGrams && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
          )}
        </div>
        {field.isGrams && (
          <p className="text-xs text-muted-foreground">
            At ₹{field.rate?.toLocaleString("en-IN")} per gram (approx.)
          </p>
        )}
      </div>
    </div>
  );
}

/** Icon chip + title + parenthetical, opening each group in the form. */
function GroupHeader({
  icon: Icon,
  tint,
  title,
  hint,
  subtitle,
}: {
  icon: typeof Wallet;
  tint: string;
  title: string;
  hint: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground">
          {title} <span className="text-sm font-normal text-muted-foreground">{hint}</span>
        </h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ZakatCalculator() {
  const [values, setValues] = useState<typeof INITIAL_VALUES>(INITIAL_VALUES);
  const [result, setResult] = useState<{ totalAssets: number; liabilities: number; net: number; zakat: number } | null>(null);

  const set = (key: keyof typeof INITIAL_VALUES): ChangeEventHandler<HTMLInputElement> => (e) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const live = useMemo(() => {
    const gold = num(values.goldGrams) * GOLD_RATE_PER_GRAM;
    const silver = num(values.silverGrams) * SILVER_RATE_PER_GRAM;
    const totalAssets = num(values.cash) + gold + silver + num(values.investments) + num(values.business) + num(values.other);
    const liabilities = num(values.liabilities);
    const net = Math.max(0, totalAssets - liabilities);
    const zakat = net * ZAKAT_RATE;
    return { totalAssets, liabilities, net, zakat };
  }, [values]);

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(live);
  };

  const reset = () => {
    setValues(INITIAL_VALUES);
    setResult(null);
  };

  const summary = result || live;

  return (
    // items-stretch (the grid default) plus h-full on both columns makes the
    // two sides finish level; the rail is no longer sticky, since a sticky
    // column cannot also stretch to its sibling's height.
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <Card className="flex h-full flex-col rounded-3xl border-border/50 shadow-lg lg:col-span-3">
        <CardContent className="flex flex-1 flex-col space-y-5 p-4 sm:space-y-6 sm:p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[hsl(var(--brand-green))]">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground md:text-2xl">Enter Your Details</h3>
              <p className="text-sm text-muted-foreground">
                Provide the current value of your assets and liabilities to calculate your Zakat.
              </p>
            </div>
          </div>

          <form onSubmit={calculate} className="flex flex-1 flex-col space-y-6">
            <div className="space-y-4">
              <GroupHeader icon={Wallet} tint="bg-emerald-50 text-emerald-700" title="Your Assets" hint="(What you own)" />
              <div className="grid gap-4 sm:grid-cols-2">
                {ASSET_FIELDS.map((f) => (
                  <MoneyField key={f.key} field={f} value={values[f.key]} onChange={set(f.key)} />
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t border-border/60 pt-6">
              <GroupHeader
                icon={FileText}
                tint="bg-rose-50 text-rose-600"
                title="Your Liabilities"
                hint="(What you owe)"
                subtitle="Enter your total liabilities (if any)."
              />
              <div className="flex flex-wrap items-center gap-4 pl-1">
                <label htmlFor="liabilities" className="text-sm font-medium text-foreground/80">
                  Liabilities
                </label>
                <div className="relative min-w-[220px] flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                  <Input
                    id="liabilities"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="0"
                    value={values.liabilities}
                    onChange={set("liabilities")}
                    className="rounded-xl border-border/70 pl-7 transition focus-visible:border-[hsl(var(--brand-green))] focus-visible:ring-[hsl(var(--brand-green))]/25"
                  />
                </div>
              </div>
            </div>

            {/* mt-auto pins the actions to the bottom of the stretched card, so
                the button row lines up with the rail's last card. */}
            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-6">
              <Button
                type="submit"
                size="lg"
                className="rounded-full border-0 bg-[image:var(--gradient-brand)] px-7 font-semibold text-white shadow-md transition hover:brightness-110"
              >
                <Calculator className="mr-2 h-4 w-4" /> Calculate Zakat <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="rounded-full border-[hsl(var(--brand-green))]/40 px-7 font-semibold text-[hsl(var(--brand-green))] transition-colors hover:border-[hsl(var(--brand-green))] hover:bg-[hsl(var(--brand-green))]/10"
                onClick={reset}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Result rail ────────────────────────────────────────────────────── */}
      <div className="flex h-full flex-col gap-4 sm:gap-5 lg:col-span-2">
        <Card className="relative overflow-hidden rounded-3xl border-none bg-[image:var(--gradient-brand)] text-white shadow-xl">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[hsl(var(--brand-lime))]/20 blur-3xl" />

          <CardContent className="relative space-y-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[hsl(var(--brand-lime))]">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight">Your Zakat Amount</h3>
                  <p className="text-xs text-white/75">Based on 2.5% of your net zakatable assets</p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--brand-green))] sm:flex">
                Nisab based calculation <Info className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              <div className="rounded-2xl bg-white/90 p-4 text-[hsl(var(--brand-green-dark))]">
                <p className="text-xs font-medium">Estimated Zakat (2.5%)</p>
                {/* break-words: a large figure would otherwise widen the grid
                    column and squeeze the breakdown beside it. */}
                <p className="mt-1 break-words text-3xl font-extrabold">{inr(summary.zakat)}</p>
              </div>

              <div className="space-y-2 text-sm text-white/85">
                <div className="flex items-center justify-between gap-3 border-b border-white/20 pb-2">
                  <span>Total Assets</span>
                  <span className="font-medium">{inr(summary.totalAssets)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-white/20 pb-2">
                  <span>Less Liabilities</span>
                  <span className="font-medium">{inr(summary.liabilities)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Net Zakatable Assets</span>
                  <span className="font-semibold">{inr(summary.net)}</span>
                </div>
              </div>
            </div>

            <blockquote className="flex gap-3 border-t border-white/20 pt-4">
              <span aria-hidden className="font-serif text-3xl leading-none text-white/40">&ldquo;</span>
              <div className="text-sm">
                <p className="italic text-white/90">
                  Take from their wealth a charity by which you purify them and increase them…
                </p>
                <footer className="mt-1 text-white/70">— Surah At-Tawbah (9:103)</footer>
              </div>
            </blockquote>
          </CardContent>
        </Card>

        {/* flex-1 lets this card take up whatever slack is left in the rail, so
            the help card below it lands level with the form's button row. */}
        <Card className="flex-1 overflow-hidden rounded-3xl border-[hsl(var(--brand-green))]/15 bg-[hsl(var(--brand-green))]/5">
          <CardContent className="flex h-full flex-col gap-4 p-0 sm:flex-row">
            <div className="shrink-0 sm:w-2/5">
              <img
                src={zakatArtwork}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-40 w-full object-cover sm:h-full"
              />
            </div>
            <div className="space-y-2 p-5 sm:pl-0">
              <span className="inline-block rounded-full bg-[hsl(var(--brand-green))]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--brand-green))]">
                Why Pay Zakat?
              </span>
              <p className="text-base font-bold leading-snug text-foreground">
                Purify Your Wealth, Strengthen Our Community
              </p>
              <p className="text-sm text-muted-foreground">
                Zakat is due once your net zakatable assets meet the nisab threshold and a lunar year has passed on them.
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-1 rounded-full border-[hsl(var(--brand-green))]/40 font-semibold text-[hsl(var(--brand-green))] hover:bg-[hsl(var(--brand-green))]/10"
              >
                <a href="/p/about-zakat">
                  Learn More About Zakat <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Need help calculating your Zakat?</p>
              <p className="text-xs text-muted-foreground">Our team is here to help you.</p>
            </div>
            <a
              href="/p/contact-us"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[hsl(var(--brand-green))] underline-offset-4 hover:underline"
            >
              Contact Our Team <ArrowRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
