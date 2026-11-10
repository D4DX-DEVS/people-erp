import { useEffect, useState } from "react";
import { Heart, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { onlinePayments } from "@/lib/api";

const EMPTY = { name: "", phone: "", email: "" };

interface OnlineDonateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Amount picked on the band; the donor can still change it here. */
  amount: number | null;
}

/**
 * Collects the details Easebuzz requires (name, email, phone) and hands the
 * donor to the Easebuzz hosted checkout. The result comes back to
 * /donate/status once Easebuzz redirects.
 */
export function OnlineDonateDialog({ open, onOpenChange, amount }: OnlineDonateDialogProps) {
  const { toast } = useToast();
  const [donor, setDonor] = useState(EMPTY);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Each open starts from the amount chosen on the band.
  useEffect(() => {
    if (open) setValue(amount ? String(amount) : "");
  }, [open, amount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (!n || n < 1) {
      toast({ title: "Enter an amount", description: "The minimum donation is ₹1.", variant: "destructive" });
      return;
    }
    if (!donor.name.trim() || !donor.phone.trim() || !donor.email.trim()) {
      toast({ title: "Please fill required fields", description: "Name, phone and email are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await onlinePayments.initiate({ amount: n, ...donor });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-bold">Donate Online</DialogTitle>
          <DialogDescription>
            Pay securely by UPI, card, net banking or wallet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Amount (₹) *</span>
            <Input
              className="rounded-xl text-base font-semibold"
              type="number"
              min={1}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Amount"
            />
          </label>
          <Input className="rounded-xl" placeholder="Full name *" autoComplete="name" value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="rounded-xl" type="tel" placeholder="Phone *" autoComplete="tel" value={donor.phone} onChange={(e) => setDonor({ ...donor, phone: e.target.value })} />
            <Input className="rounded-xl" type="email" placeholder="Email *" autoComplete="email" value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-full" size="lg">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
            {Number(value) > 0 ? `Pay ₹ ${Number(value).toLocaleString("en-IN")}` : "Continue to Payment"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Payments are processed by Easebuzz
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
