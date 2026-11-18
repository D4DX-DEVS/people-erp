import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight, CircleCheck, CreditCard, HeartHandshake, IdCard, Landmark, Loader2,
  LockKeyhole, Mail, Phone, ShieldCheck, Smartphone, User, Wallet, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { onlinePayments } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Preset gift amounts, in rupees. */
const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

/** Above this (₹) the API requires the donor's PAN — keep in step with easebuzzController. */
const PAN_THRESHOLD = 50000;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?\d{10,15}$/;

const PAY_METHODS: Array<{ Icon: LucideIcon; label: string }> = [
  { Icon: Smartphone, label: "UPI" },
  { Icon: CreditCard, label: "Cards" },
  { Icon: Landmark, label: "Net banking" },
  { Icon: Wallet, label: "Wallets" },
];

const PROMISES = [
  "Secure checkout hosted by Easebuzz",
  "Direct impact on families in need",
  "Payment confirmation as soon as you pay",
];

type FieldName = "amount" | "name" | "phone" | "email" | "pan";
type Errors = Partial<Record<FieldName, string>>;

const EMPTY = { name: "", phone: "", email: "", pan: "" };

const formatINR = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

interface OnlineDonateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Amount picked on the band; the donor can still change it here. */
  amount: number | null;
}

/** Numbered heading for one part of the form. */
function StepLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{n}</span>
      {children}
    </p>
  );
}

interface FieldProps {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Labelled input shell: leading icon, brand focus ring, error or hint below. */
function Field({ label, icon: Icon, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground/75">{label}</span>
      <span
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-xl border bg-background px-3.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
          error ? "border-destructive" : "border-input",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {children}
      </span>
      {error ? (
        <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

const INPUT_CLASS =
  "h-full w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground";

/**
 * Collects the details Easebuzz requires (name, email, phone) — plus the PAN
 * for gifts above ₹50,000 — and hands the donor to the Easebuzz hosted
 * checkout. The result comes back to /donate/status once Easebuzz redirects.
 */
export function OnlineDonateDialog({ open, onOpenChange, amount }: OnlineDonateDialogProps) {
  const { toast } = useToast();
  const [donor, setDonor] = useState(EMPTY);
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Each open starts from the amount chosen on the band.
  useEffect(() => {
    if (open) {
      setValue(amount ? String(amount) : "");
      setErrors({});
    }
  }, [open, amount]);

  const amountNum = Number(value) || 0;
  const needsPan = amountNum > PAN_THRESHOLD;

  const clearError = (field: FieldName) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  const setField = (field: keyof typeof EMPTY, v: string) => {
    setDonor((d) => ({ ...d, [field]: v }));
    clearError(field);
  };
  const setAmount = (v: string) => {
    setValue(v);
    clearError("amount");
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (amountNum < 1) next.amount = "Enter an amount of at least ₹1.";
    if (donor.name.trim().length < 2) next.name = "Enter your full name.";
    if (!PHONE_PATTERN.test(donor.phone.replace(/[\s()-]/g, ""))) next.phone = "Enter a valid phone number.";
    if (!EMAIL_PATTERN.test(donor.email.trim())) next.email = "Enter a valid email address.";
    if (needsPan && !PAN_PATTERN.test(donor.pan)) next.pan = "Enter a valid PAN, e.g. ABCDE1234F.";
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const res = await onlinePayments.initiate({
        amount: amountNum,
        name: donor.name.trim(),
        phone: donor.phone.trim(),
        email: donor.email.trim(),
        ...(needsPan && { pan: donor.pan }),
      });
      if (!res.data?.checkoutUrl) throw new Error(res.message);
      window.location.assign(res.data.checkoutUrl);
      // Leave the spinner on while the browser navigates away.
    } catch (err) {
      toast({
        title: "Could not start the payment",
        description: err instanceof Error && err.message ? err.message : "Please try again later.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        // Focus the dialog itself rather than its first control: a focus ring on
        // the first preset amount reads as that amount being selected.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
        className={cn(
          "site-font max-h-[92vh] w-[calc(100vw-1.5rem)] min-w-0 max-w-4xl gap-0 overflow-y-auto overflow-x-hidden rounded-3xl border-0 p-0 sm:rounded-3xl",
          // Close button: white over the brand panel on phones, dark over the form beside it.
          "[&>button:last-child]:text-primary-foreground [&>button:last-child]:opacity-90 md:[&>button:last-child]:text-foreground",
        )}
      >
        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* ── Brand panel ─────────────────────────────────────────────── */}
          <aside className="relative overflow-hidden bg-gradient-hero p-6 text-primary-foreground md:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/5" />

            <div className="relative flex h-full flex-col">
              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 md:flex">
                <HeartHandshake className="h-6 w-6" />
              </div>

              <span className="inline-block self-start md:mt-5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                Support Our Mission
              </span>
              <DialogTitle className="mt-3 text-3xl leading-tight text-primary-foreground md:text-4xl">
                Donate Online
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-primary-foreground/85">
                Every rupee brings a family closer to a brighter tomorrow.
              </DialogDescription>

              <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">Your donation</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
                  {amountNum > 0 ? formatINR(amountNum) : "₹ —"}
                </p>
              </div>

              <ul className="mt-auto hidden space-y-3 pt-8 md:block">
                {PROMISES.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-primary-foreground/90">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Form ────────────────────────────────────────────────────── */}
          <form onSubmit={submit} noValidate className="space-y-6 p-5 sm:p-6 md:p-8">
            <fieldset>
              <legend className="contents">
                <StepLabel n={1}>Choose an amount</StepLabel>
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((v) => {
                  const active = amountNum === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                        active
                          ? "border-transparent bg-[hsl(var(--warning))] text-white shadow-md"
                          : "border-input bg-background text-primary hover:border-primary/40 hover:bg-primary/5",
                      )}
                    >
                      {formatINR(v)}
                    </button>
                  );
                })}
              </div>
              <label className="mt-2.5 block">
                <span className="sr-only">Other amount in rupees</span>
                <span
                  className={cn(
                    "flex h-14 items-center gap-2 rounded-xl border bg-[hsl(var(--secondary))]/60 px-4 transition focus-within:border-primary focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10",
                    errors.amount ? "border-destructive" : "border-input",
                  )}
                >
                  <span className="text-xl font-bold text-primary">₹</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Other amount"
                    className="h-full w-full min-w-0 bg-transparent text-xl font-bold tabular-nums text-foreground outline-none [appearance:textfield] placeholder:text-base placeholder:font-medium placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {needsPan && (
                    <span className="shrink-0 rounded-full bg-[hsl(var(--warning))]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--warning))]">
                      PAN needed
                    </span>
                  )}
                </span>
                {errors.amount && <span className="mt-1 block text-xs font-medium text-destructive">{errors.amount}</span>}
              </label>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="contents">
                <StepLabel n={2}>Your details</StepLabel>
              </legend>
              <Field label="Full name *" icon={User} error={errors.name}>
                <input
                  className={INPUT_CLASS}
                  placeholder="As it should appear on the receipt"
                  autoComplete="name"
                  value={donor.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone *" icon={Phone} error={errors.phone}>
                  <input
                    className={INPUT_CLASS}
                    type="tel"
                    inputMode="tel"
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    value={donor.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </Field>
                <Field label="Email *" icon={Mail} error={errors.email}>
                  <input
                    className={INPUT_CLASS}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={donor.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </Field>
              </div>

              {needsPan && (
                <div className="duration-300 animate-in fade-in-0 slide-in-from-top-2">
                  <Field
                    label="PAN *"
                    icon={IdCard}
                    error={errors.pan}
                    hint={`Required for donations above ${formatINR(PAN_THRESHOLD)}.`}
                  >
                    <input
                      className={cn(INPUT_CLASS, "uppercase tracking-[0.18em]")}
                      placeholder="ABCDE1234F"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={10}
                      value={donor.pan}
                      onChange={(e) => setField("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                    />
                  </Field>
                </div>
              )}
            </fieldset>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={submitting}
                className="h-auto w-full rounded-xl bg-[hsl(var(--warning))] py-4 text-base font-bold text-white shadow-md hover:bg-[hsl(var(--warning))]/90"
              >
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LockKeyhole className="mr-2 h-5 w-5" />}
                {submitting
                  ? "Opening secure checkout…"
                  : amountNum > 0
                    ? `Donate ${formatINR(amountNum)} Securely`
                    : "Continue to Payment"}
                {!submitting && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground/70">
                  <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--brand-green))]" /> Secured by Easebuzz
                </span>
                {PAY_METHODS.map(({ Icon, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
